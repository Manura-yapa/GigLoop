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
    required: true
  },
  category: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in progress', 'completed'],
    default: 'open'
  }
}, { timestamps: true });

module.exports = mongoose.model('Gig', gigSchema);