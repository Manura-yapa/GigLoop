const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    time: {
      type: String,
      required: true,
    },

    // Optional on historical messages.
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    clientMessageId: {
      type: String,
    },
  },
  { timestamps: true }
);

// Retrying the same send must not create another message.
messageSchema.index(
  { conversationId: 1, senderId: 1, clientMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      clientMessageId: { $type: 'string' },
    },
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('Message', messageSchema);