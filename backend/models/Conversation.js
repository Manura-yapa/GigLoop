const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// One private conversation per student and gig.
conversationSchema.index(
  { gigId: 1, studentId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);