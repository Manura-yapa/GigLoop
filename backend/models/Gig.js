const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  posterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true,
    trim: true
  },

  category: {
    type: String,
    required: true,
    trim: true
  },

  budget: {
    type: Number,
    required: true,
    validate: {
      validator: (value) => Number.isFinite(value) && value > 0,
      message: 'Budget must be a positive number.'
    }
  },

  deadline: {
    type: Date,
    required: true
  },

  skillsRequired: {
    type: [String],
    default: []
  },

  status: {
    type: String,
    enum: ['open', 'in progress', 'completed', 'cancelled'],
    default: 'open'
  },

  assignedFreelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  applicationsCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Gig', gigSchema);