const express = require('express');
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const User = require('../models/User');
const Gig = require('../models/Gig');
const Application = require('../models/Application');
const Review = require('../models/Review');

const router = express.Router();

router.use(auth, adminOnly);

// Explicitly select fields that administrators need.
// Password hashes are never included.
const USER_FIELDS = [
  'name',
  'email',
  'faculty',
  'studentId',
  'role',
  'userType',
  'activeRole',
  'isVerifiedStudent',
  'isBanned',
  'rating',
  'reviewCount',
  'createdAt',
].join(' ');

const validId = (value) => mongoose.isObjectIdOrHexString(value);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const serverError = (res, error) => {
  console.error('Admin request failed:', error.name);

  return res.status(500).json({
    error: 'Unable to process the admin request.',
  });
};

// Platform statistics.
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      studentUsers,
      clientUsers,
      adminUsers,
      bannedUsers,
      totalGigs,
      openGigs,
      inProgressGigs,
      completedGigs,
      cancelledGigs,
      totalApplications,
      totalReviews,
      budgetSummary,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ userType: 'student' }),
      User.countDocuments({ userType: 'client' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isBanned: true }),
      Gig.countDocuments(),
      Gig.countDocuments({ status: 'open' }),
      Gig.countDocuments({ status: 'in progress' }),
      Gig.countDocuments({ status: 'completed' }),
      Gig.countDocuments({ status: 'cancelled' }),
      Application.countDocuments(),
      Review.countDocuments(),
      Gig.aggregate([
        {
          $group: {
            _id: null,
            totalBudget: { $sum: '$budget' },
          },
        },
      ]),
    ]);

    return res.json({
      totalUsers,
      studentUsers,
      clientUsers,
      adminUsers,
      bannedUsers,
      totalGigs,
      openGigs,
      inProgressGigs,
      completedGigs,
      cancelledGigs,
      totalApplications,
      totalReviews,
      totalBudgetVolume: budgetSummary[0]?.totalBudget || 0,
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Search accounts and filter by account type.
router.get('/users', async (req, res) => {
  const { search = '', userType = 'all' } = req.query;

  if (
    typeof search !== 'string' ||
    search.trim().length > 100
  ) {
    return res.status(400).json({
      error: 'Search must be text with no more than 100 characters.',
    });
  }

  if (!['all', 'student', 'client', 'admin'].includes(userType)) {
    return res.status(400).json({
      error: 'Invalid account type filter.',
    });
  }

  const filter = {};

  if (userType !== 'all') {
    filter.userType = userType;
  }

  if (search.trim()) {
    const pattern = {
      $regex: escapeRegex(search.trim()),
      $options: 'i',
    };

    filter.$or = [
      { name: pattern },
      { email: pattern },
      { faculty: pattern },
      { studentId: pattern },
    ];
  }

  try {
    const users = await User.find(filter)
      .select(USER_FIELDS)
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.json(users);
  } catch (error) {
    return serverError(res, error);
  }
});

// Set suspension state explicitly.
router.put('/users/:id/ban', async (req, res) => {
  const { id } = req.params;
  const { isBanned } = req.body;

  if (!validId(id)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  if (typeof isBanned !== 'boolean') {
    return res.status(400).json({
      error: 'isBanned must be true or false.',
    });
  }

  try {
    const user = await User.findOneAndUpdate(
      {
        _id: id,
        role: { $ne: 'admin' },
      },
      {
        $set: { isBanned },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(USER_FIELDS);

    if (!user) {
      const exists = await User.exists({ _id: id });

      return res.status(exists ? 403 : 404).json({
        error: exists
          ? 'Administrator accounts cannot be suspended here.'
          : 'User not found.',
      });
    }

    return res.json({
      message: isBanned
        ? 'Account suspended successfully.'
        : 'Account reactivated successfully.',
      isBanned: user.isBanned,
      user,
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Record or revoke verification for an existing student account.
router.put('/users/:id/verify-student', async (req, res) => {
  const { id } = req.params;
  const { isVerifiedStudent } = req.body;

  if (!validId(id)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  if (typeof isVerifiedStudent !== 'boolean') {
    return res.status(400).json({
      error: 'isVerifiedStudent must be true or false.',
    });
  }

  try {
    const user = await User.findOneAndUpdate(
      {
        _id: id,
        userType: 'student',
        role: { $ne: 'admin' },
      },
      {
        $set: { isVerifiedStudent },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(USER_FIELDS);

    if (!user) {
      const exists = await User.exists({ _id: id });

      return res.status(exists ? 409 : 404).json({
        error: exists
          ? 'Verification can only be changed for student accounts.'
          : 'User not found.',
      });
    }

    return res.json({
      message: isVerifiedStudent
        ? 'Student verification recorded.'
        : 'Student verification removed.',
      user,
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// List platform gigs for moderation.
router.get('/gigs', async (req, res) => {
  try {
    const gigs = await Gig.find()
      .sort({ createdAt: -1, _id: -1 })
      .populate('posterId', 'name email faculty userType isBanned')
      .populate('assignedFreelancer', 'name email faculty')
      .lean();

    return res.json(gigs);
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;