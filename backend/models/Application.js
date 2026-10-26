const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true
  },

  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  bidAmount: {
    type: Number,
    required: true,
    validate: {
      validator: (value) => Number.isFinite(value) && value > 0,
      message: 'Bid amount must be a positive number.'
    }
  },

  estimatedDays: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isSafeInteger,
      message: 'Estimated days must be a whole number.'
    }
  },

  pitch: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

// A student can have only one application per gig.
applicationSchema.index(
  { gigId: 1, applicantId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Application', applicationSchema);