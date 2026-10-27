const express = require('express');
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const Review = require('../models/Review');
const User = require('../models/User');
const Gig = require('../models/Gig');

const router = express.Router();

const validId = (value) => mongoose.isObjectIdOrHexString(value);

const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

const handleError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({
      error: 'You have already reviewed this gig.',
    });
  }

  if (error.status) {
    return res.status(error.status).json({
      error: error.message,
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Invalid review details.',
    });
  }

  console.error('Review request failed:', error.name);

  return res.status(500).json({
    error: 'Unable to process the review request.',
  });
};

// Submit a review for the other participant in a completed gig.
router.post('/', auth, async (req, res) => {
  const { gigId, revieweeId, rating, comment } = req.body;

  if (!validId(gigId)) {
    return res.status(400).json({
      error: 'Invalid gig ID.',
    });
  }

  // Optional for compatibility with the target frontend.
  // The server determines the actual recipient.
  if (revieweeId !== undefined && !validId(revieweeId)) {
    return res.status(400).json({
      error: 'Invalid review recipient ID.',
    });
  }

  const numericRating =
    typeof rating === 'number'
      ? rating
      : typeof rating === 'string' && rating.trim() !== ''
        ? Number(rating)
        : NaN;

  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    return res.status(400).json({
      error: 'Rating must be a whole number from 1 to 5.',
    });
  }

  if (
    typeof comment !== 'string' ||
    comment.trim().length === 0 ||
    comment.trim().length > 2000
  ) {
    return res.status(400).json({
      error: 'Comment must contain between 1 and 2,000 characters.',
    });
  }

  try {
    // Ensure the unique index is ready before accepting submissions.
    await Review.init();

    const result = await mongoose.connection.transaction(
      async (session) => {
        const gig = await Gig.findById(gigId).session(session);

        if (!gig) {
          fail(404, 'Gig not found.');
        }

        if (gig.status !== 'completed') {
          fail(409, 'Reviews are allowed only for completed gigs.');
        }

        if (!gig.assignedFreelancer) {
          fail(409, 'This gig does not have an assigned freelancer.');
        }

        const ownerId = String(gig.posterId);
        const freelancerId = String(gig.assignedFreelancer);
        const reviewerId = req.user.id;

        if (ownerId === freelancerId) {
          fail(409, 'You cannot review yourself.');
        }

        let recipientId;

        if (reviewerId === ownerId) {
          recipientId = freelancerId;
        } else if (reviewerId === freelancerId) {
          recipientId = ownerId;
        } else {
          fail(403, 'Only the two gig participants can submit reviews.');
        }

        if (
          revieweeId !== undefined &&
          String(revieweeId).toLowerCase() !== recipientId
        ) {
          fail(400, 'The review recipient must be the other gig participant.');
        }

        const existingReview = await Review.findOne({
          gigId: gig._id,
          reviewerId,
        }).session(session);

        if (existingReview) {
          fail(409, 'You have already reviewed this gig.');
        }

        // Coordinate this transaction with gig changes and deletion.
        const gigWrite = await Gig.updateOne(
          {
            _id: gig._id,
            status: 'completed',
            assignedFreelancer: gig.assignedFreelancer,
          },
          {
            $inc: { __v: 1 },
          },
          { session }
        );

        if (gigWrite.matchedCount !== 1) {
          fail(409, 'The gig changed. Refresh and try again.');
        }

        // Serialize rating updates for this recipient, including reviews
        // submitted concurrently for different gigs.
        const recipient = await User.findOneAndUpdate(
          { _id: recipientId },
          { $inc: { __v: 1 } },
          {
            new: true,
            session,
          }
        ).select('_id');

        if (!recipient) {
          fail(404, 'The review recipient no longer exists.');
        }

        const [review] = await Review.create(
          [
            {
              gigId: gig._id,
              reviewerId,
              revieweeId: recipient._id,
              rating: numericRating,
              comment: comment.trim(),
            },
          ],
          { session }
        );

        // Calculate from original review scores, not a rounded old average.
        const [summary] = await Review.aggregate([
          {
            $match: {
              revieweeId: recipient._id,
            },
          },
          {
            $group: {
              _id: null,
              average: { $avg: '$rating' },
              count: { $sum: 1 },
            },
          },
        ]).session(session);

        const averageRating = Number(summary.average.toFixed(1));

        await User.updateOne(
          { _id: recipient._id },
          {
            $set: {
              rating: averageRating,
              reviewCount: summary.count,
            },
          },
          { session }
        );

        return {
          review,
          avgRating: averageRating,
          reviewCount: summary.count,
        };
      }
    );

    return res.status(201).json({
      message: 'Review submitted successfully.',
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// Public list of reviews received by a user.
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!validId(userId)) {
    return res.status(400).json({
      error: 'Invalid user ID.',
    });
  }

  try {
    const userExists = await User.exists({ _id: userId });

    if (!userExists) {
      return res.status(404).json({
        error: 'User not found.',
      });
    }

    const reviews = await Review.find({ revieweeId: userId })
      .sort({ createdAt: -1, _id: -1 })
      .populate('reviewerId', 'name faculty userType')
      .populate('gigId', 'title category');

    return res.json(reviews);
  } catch (error) {
    return handleError(res, error);
  }
});

// Participants and admins can inspect the reviews for a gig.
router.get('/gig/:gigId', auth, async (req, res) => {
  const { gigId } = req.params;

  if (!validId(gigId)) {
    return res.status(400).json({
      error: 'Invalid gig ID.',
    });
  }

  try {
    const gig = await Gig.findById(gigId);

    if (!gig) {
      return res.status(404).json({
        error: 'Gig not found.',
      });
    }

    const isOwner = String(gig.posterId) === req.user.id;
    const isFreelancer =
      gig.assignedFreelancer &&
      String(gig.assignedFreelancer) === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isFreelancer && !isAdmin) {
      return res.status(403).json({
        error: 'Only gig participants or an admin can view these reviews.',
      });
    }

    const reviews = await Review.find({ gigId })
      .sort({ createdAt: -1, _id: -1 })
      .populate('reviewerId', 'name faculty')
      .populate('revieweeId', 'name faculty');

    return res.json(reviews);
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;