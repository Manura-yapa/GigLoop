const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const auth = require('./middleware/auth');
const User = require('./models/User');
const Gig = require('./models/Gig');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

const router = express.Router();
router.use(auth);

const validId = (value) =>
  typeof value === 'string' && mongoose.isObjectIdOrHexString(value);

const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const publicError = (error) => ({
  status: error.status || 500,
  error: error.status ? error.message : 'Chat request failed.',
});

const handleHttpError = (res, error) => {
  const result = publicError(error);
  return res.status(result.status).json({ error: result.error });
};

async function conversationAccess(conversationId, userId) {
  if (!validId(conversationId)) {
    fail(400, 'Invalid conversation ID.');
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    fail(404, 'Conversation not found.');
  }

  const isParticipant =
    String(conversation.ownerId) === String(userId) ||
    String(conversation.studentId) === String(userId);

  if (!isParticipant) {
    fail(403, 'You cannot access this conversation.');
  }

  const gig = await Gig.findById(conversation.gigId);

  if (!gig) {
    fail(404, 'This gig is no longer available.');
  }

  return {
    conversation,
    gig,
    canWrite: ['open', 'in progress'].includes(gig.status),
  };
}

// Owner: list conversations for this gig.
// Student: list only their own conversation.
router.get('/gigs/:gigId', async (req, res) => {
  try {
    const { gigId } = req.params;

    if (!validId(gigId)) fail(400, 'Invalid gig ID.');

    const gig = await Gig.findById(gigId);
    if (!gig) fail(404, 'Gig not found.');

    const filter = { gigId };

    if (String(gig.posterId) !== req.user.id) {
      filter.studentId = req.user.id;
    }

    const conversations = await Conversation.find(filter)
      .sort({ createdAt: -1 })
      .populate('ownerId', 'name')
      .populate('studentId', 'name');

    return res.json(conversations);
  } catch (error) {
    return handleHttpError(res, error);
  }
});

// Start a private conversation with the gig owner.
router.post('/gigs/:gigId', async (req, res) => {
  try {
    const { gigId } = req.params;

    if (!validId(gigId)) fail(400, 'Invalid gig ID.');

    const gig = await Gig.findById(gigId);
    if (!gig) fail(404, 'Gig not found.');

    if (String(gig.posterId) === req.user.id) {
      fail(400, 'Select a student conversation from the conversation list.');
    }

    const existing = await Conversation.findOne({
      gigId,
      studentId: req.user.id,
    });

    if (existing) return res.json(existing);

    if (
      req.userDetails.userType !== 'student' ||
      req.userDetails.activeRole !== 'freelancer'
    ) {
      fail(403, 'Switch to freelancer mode to start a conversation.');
    }

    if (gig.status !== 'open') {
      fail(409, 'New conversations can only be started on open gigs.');
    }

    const owner = await User.findById(gig.posterId).select('isBanned');

    if (!owner || owner.isBanned) {
      fail(409, 'The gig owner is unavailable.');
    }

    let conversation;

    try {
      conversation = await Conversation.create({
        gigId: gig._id,
        ownerId: gig.posterId,
        studentId: req.user.id,
      });
    } catch (error) {
      // Another tab or request may have created it first.
      if (error.code !== 11000) throw error;

      conversation = await Conversation.findOne({
        gigId,
        studentId: req.user.id,
      });
    }

    return res.status(201).json(conversation);
  } catch (error) {
    return handleHttpError(res, error);
  }
});

// Return the latest 200 messages, oldest first.
router.get('/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    await conversationAccess(conversationId, req.user.id);

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(200)
      .lean();

    return res.json(messages.reverse());
  } catch (error) {
    return handleHttpError(res, error);
  }
});

async function socketUser(socket) {
  let payload;

  try {
    payload = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
  } catch {
    fail(401, 'Your session expired or is invalid. Log in again.');
  }

  if (!validId(payload.id) || !Number.isFinite(payload.exp)) {
    fail(401, 'Invalid session.');
  }

  const user = await User.findById(payload.id)
    .select('name isBanned');

  if (!user) fail(401, 'Account no longer exists.');
  if (user.isBanned) fail(403, 'Your account is suspended.');

  return { user, expiresAt: payload.exp * 1000 };
}

function attachChat(io) {
  io.use(async (socket, next) => {
    try {
      const { expiresAt } = await socketUser(socket);
      socket.data.expiresAt = expiresAt;
      next();
    } catch (error) {
      next(new Error(publicError(error).error));
    }
  });

  io.on('connection', (socket) => {
    const expiryTimer = setTimeout(() => {
      socket.emit('session_error', 'Your session expired. Log in again.');
      socket.disconnect(true);
    }, Math.max(0, Math.min(
      socket.data.expiresAt - Date.now(),
      2147483647
    )));

    const acknowledgeError = (ack, error) => {
      const result = publicError(error);

      if (typeof ack === 'function') {
        ack({ ok: false, error: result.error });
      }

      if (result.status === 401 || result.status === 403) {
        socket.emit('session_error', result.error);
        socket.disconnect(true);
      }
    };

    socket.on('join_room', async (conversationId, ack) => {
      try {
        const { user } = await socketUser(socket);
        const access = await conversationAccess(
          conversationId,
          String(user._id)
        );

        if (!socket.connected) return;

        await socket.join(`conversation:${conversationId}`);

        if (typeof ack === 'function') {
          ack({ ok: true, canWrite: access.canWrite });
        }
      } catch (error) {
        acknowledgeError(ack, error);
      }
    });

    socket.on('leave_room', (conversationId) => {
      if (validId(conversationId)) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on('send_message', async (data, ack) => {
      try {
        const { user } = await socketUser(socket);
        const { conversationId, clientMessageId, message } = data || {};

        if (
          typeof clientMessageId !== 'string' ||
          !/^[a-zA-Z0-9-]{16,100}$/.test(clientMessageId)
        ) {
          fail(400, 'Invalid message identifier.');
        }

        if (
          typeof message !== 'string' ||
          !message.trim() ||
          message.trim().length > 2000
        ) {
          fail(400, 'Messages must contain between 1 and 2,000 characters.');
        }

        const access = await conversationAccess(
          conversationId,
          String(user._id)
        );

        if (!socket.rooms.has(`conversation:${conversationId}`)) {
          fail(409, 'Reconnect to the conversation before sending.');
        }

        const identity = {
          conversationId,
          senderId: user._id,
          clientMessageId,
        };

        let saved = await Message.findOne(identity);

        if (saved && saved.message !== message.trim()) {
          fail(409, 'This message identifier was already used.');
        }

        if (!saved) {
          if (!access.canWrite) {
            fail(409, 'This gig is closed. Its conversation is read-only.');
          }

          try {
            saved = await Message.create({
              ...identity,
              room: conversationId,
              author: user.name,
              message: message.trim(),
              time: new Date().toISOString(),
            });
          } catch (error) {
            if (error.code !== 11000) throw error;
            saved = await Message.findOne(identity);

            if (!saved || saved.message !== message.trim()) {
              fail(409, 'This message identifier was already used.');
            }
          }
        }

        if (typeof ack === 'function') {
          ack({ ok: true, message: saved.toObject() });
        }

        // Check each recipient again before delivering a message.
        // A suspended or expired socket must not keep receiving chat.
        const recipients = await io
          .in(`conversation:${conversationId}`)
          .fetchSockets();

        await Promise.allSettled(
          recipients.map(async (recipient) => {
            try {
              const { user: recipientUser } = await socketUser(recipient);

              await conversationAccess(
                conversationId,
                String(recipientUser._id)
              );

              if (recipient.rooms.has(`conversation:${conversationId}`)) {
                recipient.emit('receive_message', saved.toObject());
              }
            } catch {
              recipient.emit(
                'session_error',
                'Chat access ended. Refresh or log in again.'
              );
              recipient.disconnect(true);
            }
          })
        );
      } catch (error) {
        acknowledgeError(ack, error);
      }
    });

    socket.on('disconnect', () => {
      clearTimeout(expiryTimer);
    });
  });
}

module.exports = { router, attachChat };