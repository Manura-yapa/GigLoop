const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: true,
    },

    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number.',
      },
    },

    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

// Each participant can write one review per gig.
reviewSchema.index(
  { gigId: 1, reviewerId: 1 },
  { unique: true }
);

// Support loading a user's received reviews.
reviewSchema.index({ revieweeId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);