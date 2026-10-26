const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Application = require('../models/Application');
const Gig = require('../models/Gig');

const router = express.Router();

// All application endpoints require login.
router.use(auth);

const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const handleError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({
      error: 'You have already applied to this gig.'
    });
  }

  if (error.status) {
    return res.status(error.status).json({
      error: error.message
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Please check your proposal details.'
    });
  }

  console.error('Application request failed:', error.name);

  return res.status(500).json({
    error: 'Unable to process the application request.'
  });
};

const validId = (value) => {
  return mongoose.isObjectIdOrHexString(value);
};

const parseNumber = (value) => {
  if (
    typeof value !== 'number' &&
    !(typeof value === 'string' && value.trim() !== '')
  ) {
    return NaN;
  }

  return Number(value);
};

// Submit a proposal.
router.post('/:gigId/apply', async (req, res) => {
  try {
    const user = req.userDetails;
    const { gigId } = req.params;
    const { bidAmount, estimatedDays, pitch } = req.body || {};

    if (user.userType !== 'student') {
      fail(403, 'Only student accounts can apply for gigs.');
    }

    if (user.activeRole !== 'freelancer') {
      fail(403, 'Switch to freelancer mode before applying.');
    }

    if (!validId(gigId)) {
      fail(400, 'Invalid gig ID.');
    }

    const amount = parseNumber(bidAmount);
    const days = parseNumber(estimatedDays);

    if (!Number.isFinite(amount) || amount <= 0) {
      fail(400, 'Bid amount must be a positive number.');
    }

    if (!Number.isSafeInteger(days) || days < 1) {
      fail(400, 'Estimated days must be a positive whole number.');
    }

    if (
      typeof pitch !== 'string' ||
      !pitch.trim() ||
      pitch.trim().length > 2000
    ) {
      fail(400, 'Proposal pitch must contain 1 to 2000 characters.');
    }

    // Ensure the model's unique index is ready before accepting proposals.
    await Application.init();

    const application = await mongoose.connection.transaction(
      async (session) => {
        const gig = await Gig.findById(gigId).session(session);

        if (!gig) {
          fail(404, 'Gig not found.');
        }

        if (gig.status !== 'open') {
          fail(409, 'This gig is not open for applications.');
        }

        if (gig.posterId.toString() === req.user.id) {
          fail(403, 'You cannot apply to your own gig.');
        }

        const existing = await Application.findOne({
          gigId,
          applicantId: req.user.id
        }).session(session);

        if (existing) {
          fail(409, 'You have already applied to this gig.');
        }

        const [created] = await Application.create(
          [{
            gigId,
            applicantId: req.user.id,
            bidAmount: amount,
            estimatedDays: days,
            pitch: pitch.trim(),
            status: 'pending'
          }],
          { session }
        );

        // Writing the gig also coordinates with concurrent deletion.
        const updated = await Gig.updateOne(
          { _id: gigId, status: 'open' },
          { $inc: { applicationsCount: 1 } },
          { session }
        );

        if (updated.matchedCount !== 1) {
          fail(409, 'The gig is no longer available.');
        }

        return created;
      }
    );

    return res.status(201).json({
      message: 'Proposal submitted successfully.',
      application
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// List applications submitted by the logged-in user.
router.get('/my-applications', async (req, res) => {
  try {
    const applications = await Application.find({
      applicantId: req.user.id
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'gigId',
        select: 'title category budget deadline status posterId',
        populate: {
          path: 'posterId',
          select: 'name faculty'
        }
      });

    return res.json(applications);
  } catch (error) {
    return handleError(res, error);
  }
});

// Only the gig owner or an admin may view its applicants.
router.get('/gig/:gigId', async (req, res) => {
  try {
    const { gigId } = req.params;

    if (!validId(gigId)) {
      fail(400, 'Invalid gig ID.');
    }

    const gig = await Gig.findById(gigId);

    if (!gig) {
      fail(404, 'Gig not found.');
    }

    const isOwner = gig.posterId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      fail(403, 'Only the gig owner or an admin can view applicants.');
    }

    const applications = await Application.find({ gigId })
      .sort({ createdAt: -1 })
      .populate(
        'applicantId',
        'name faculty skills bio rating reviewCount isVerifiedStudent'
      );

    return res.json(applications);
  } catch (error) {
    return handleError(res, error);
  }
});

// Withdraw a pending proposal.
router.delete('/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      fail(400, 'Invalid application ID.');
    }

    await mongoose.connection.transaction(async (session) => {
      const application = await Application.findById(
        req.params.id
      ).session(session);

      if (!application) {
        fail(404, 'Application not found.');
      }

      if (application.applicantId.toString() !== req.user.id) {
        fail(403, 'You can only withdraw your own applications.');
      }

      if (application.status !== 'pending') {
        fail(409, 'Only pending applications can be withdrawn.');
      }

      const removed = await Application.deleteOne(
        {
          _id: application._id,
          applicantId: req.user.id,
          status: 'pending'
        },
        { session }
      );

      if (removed.deletedCount !== 1) {
        fail(409, 'The application has changed. Refresh and try again.');
      }

      // Recalculate rather than risking a negative count.
      const remaining = await Application.countDocuments({
        gigId: application.gigId
      }).session(session);

      await Gig.updateOne(
        { _id: application.gigId },
        { $set: { applicationsCount: remaining } },
        { session }
      );
    });

    return res.json({
      message: 'Application withdrawn successfully.'
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;