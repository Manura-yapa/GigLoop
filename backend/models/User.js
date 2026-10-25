const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  // Permanent account capability used by the existing backend.
  role: {
    type: String,
    enum: ['freelancer', 'customer', 'admin'],
    default: 'customer'
  },

  // Account category.
  userType: {
    type: String,
    enum: ['student', 'client', 'admin'],
    default: function () {
      if (this.role === 'admin') return 'admin';
      if (this.role === 'freelancer') return 'student';
      return 'client';
    }
  },

  // The mode currently selected by the user.
  activeRole: {
    type: String,
    enum: ['freelancer', 'customer', 'admin'],
    default: function () {
      return this.role || 'customer';
    }
  },

  faculty: {
    type: String,
    default: 'Public Client'
  },

  studentId: {
    type: String,
    default: ''
  },

  isVerifiedStudent: {
    type: Boolean,
    default: false
  },

  isBanned: {
    type: Boolean,
    default: false
  },

  skills: {
    type: [String],
    default: []
  },

  bio: {
    type: String,
    default: ''
  },

  rating: {
    type: Number,
    default: 0
  },

  reviewCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);