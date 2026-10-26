const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Gig = require('../models/Gig');
const Application = require('../models/Application');

const router = express.Router();

const STATUSES = ['open', 'in progress', 'completed', 'cancelled'];

const POSTER_FIELDS = 'name faculty role userType rating reviewCount';
const FREELANCER_FIELDS = 'name faculty rating reviewCount skills';

// Treat search input as ordinary text rather than a regex pattern.
const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const validId = (value) => {
  return mongoose.isObjectIdOrHexString(value);
};

// Accept a number or a nonempty numeric string.
const parseNumber = (value) => {
  if (
    typeof value !== 'number' &&
    !(typeof value === 'string' && value.trim() !== '')
  ) {
    return NaN;
  }

  return Number(value);
};

// Create a gig.
router.post('/create', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      budget,
      deadline,
      skillsRequired
    } = req.body || {};

    const textFields = { title, description, category };

    for (const [field, value] of Object.entries(textFields)) {
      if (typeof value !== 'string' || !value.trim()) {
        return res.status(400).json({
          error: `${field} is required and must be text.`
        });
      }
    }

    const numericBudget = parseNumber(budget);

    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      return res.status(400).json({
        error: 'Budget must be a positive number.'
      });
    }

    if (typeof deadline !== 'string' || !deadline.trim()) {
      return res.status(400).json({
        error: 'A valid deadline is required.'
      });
    }

    const parsedDeadline = new Date(deadline);

    if (Number.isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({
        error: 'Deadline must be a valid date.'
      });
    }

    let skills = [];

    if (skillsRequired !== undefined) {
      if (typeof skillsRequired === 'string') {
        skills = skillsRequired.split(',');
      } else if (
        Array.isArray(skillsRequired) &&
        skillsRequired.every((skill) => typeof skill === 'string')
      ) {
        skills = skillsRequired;
      } else {
        return res.status(400).json({
          error: 'Required skills must be text or an array of strings.'
        });
      }
    }

    skills = [
      ...new Set(skills.map((skill) => skill.trim()).filter(Boolean))
    ];

    if (
      skills.length > 20 ||
      skills.some((skill) => skill.length > 50)
    ) {
      return res.status(400).json({
        error: 'Use at most 20 skills, each at most 50 characters.'
      });
    }

    const gig = await Gig.create({
      posterId: req.user.id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      budget: numericBudget,
      deadline: parsedDeadline,
      skillsRequired: skills,
      status: 'open'
    });

    return res.status(201).json({
      message: 'Gig created successfully.',
      gig
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Please check the gig details.'
      });
    }

    return res.status(500).json({
      error: 'Server error while creating the gig.'
    });
  }
});

// Public listing with optional filters.
// Keep this route before /:id.
router.get('/all', async (req, res) => {
  try {
    const {
      category,
      search,
      minBudget,
      maxBudget,
      status
    } = req.query;

    const filters = { category, search, minBudget, maxBudget, status };

    for (const value of Object.values(filters)) {
      if (value !== undefined && typeof value !== 'string') {
        return res.status(400).json({
          error: 'Each filter must contain a single text value.'
        });
      }
    }

    const query = {};
    const categoryText = category?.trim();
    const searchText = search?.trim();
    const statusText = status?.trim();

    if (categoryText && categoryText.toLowerCase() !== 'all') {
      query.category = categoryText;
    }

    if (statusText && statusText.toLowerCase() !== 'all') {
      if (!STATUSES.includes(statusText)) {
        return res.status(400).json({
          error: 'Invalid status filter.'
        });
      }

      query.status = statusText;
    }

    if (searchText) {
      if (searchText.length > 100) {
        return res.status(400).json({
          error: 'Search text must be at most 100 characters.'
        });
      }

      const pattern = new RegExp(escapeRegex(searchText), 'i');

      query.$or = [
        { title: pattern },
        { description: pattern },
        { category: pattern },
        { skillsRequired: pattern }
      ];
    }

    const hasMin = minBudget !== undefined;
    const hasMax = maxBudget !== undefined;

    const minimum = hasMin ? parseNumber(minBudget) : undefined;
    const maximum = hasMax ? parseNumber(maxBudget) : undefined;

    if (
      (hasMin && (!Number.isFinite(minimum) || minimum < 0)) ||
      (hasMax && (!Number.isFinite(maximum) || maximum < 0))
    ) {
      return res.status(400).json({
        error: 'Budget filters must be nonnegative numbers.'
      });
    }

    if (hasMin && hasMax && minimum > maximum) {
      return res.status(400).json({
        error: 'Minimum budget cannot exceed maximum budget.'
      });
    }

    if (hasMin || hasMax) {
      query.budget = {};

      if (hasMin) query.budget.$gte = minimum;
      if (hasMax) query.budget.$lte = maximum;
    }

    const gigs = await Gig.find(query)
      .sort({ createdAt: -1 })
      .populate('posterId', POSTER_FIELDS)
      .populate('assignedFreelancer', FREELANCER_FIELDS);

    return res.json(gigs);
  } catch (error) {
    return res.status(500).json({
      error: 'Server error while fetching gigs.'
    });
  }
});

// Current user's posted gigs.
// Keep this route before /:id.
router.get('/my-posted', auth, async (req, res) => {
  try {
    const gigs = await Gig.find({ posterId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('assignedFreelancer', FREELANCER_FIELDS);

    return res.json(gigs);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch your posted gigs.'
    });
  }
});

// Public details for one gig.
router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({
      error: 'Invalid gig ID.'
    });
  }

  try {
    const gig = await Gig.findById(req.params.id)
      .populate('posterId', POSTER_FIELDS)
      .populate('assignedFreelancer', FREELANCER_FIELDS);

    if (!gig) {
      return res.status(404).json({
        error: 'Gig not found.'
      });
    }

    return res.json(gig);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch gig details.'
    });
  }
});

// Preserve owner/admin status updates.
// Detailed hiring transitions will be added in Step 10.
router.put('/:id/status', auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ error: 'Invalid gig ID.' });
  }

  if (!['completed', 'cancelled'].includes(status)) {
    return res.status(400).json({
      error:
        'Choose completed or cancelled. Accept a proposal to start a gig.',
    });
  }

  // Local helper for transaction errors.
  const rejectRequest = (httpStatus, message) => {
    const error = new Error(message);
    error.status = httpStatus;
    throw error;
  };

  try {
    const updatedGig = await mongoose.connection.transaction(
      async (session) => {
        const gig = await Gig.findById(id).session(session);

        if (!gig) {
          rejectRequest(404, 'Gig not found.');
        }

        const isOwner = String(gig.posterId) === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
          rejectRequest(
            403,
            'Only the gig owner or an admin can change its status.'
          );
        }

        const allowedTransitions = {
          open: ['cancelled'],
          'in progress': ['completed', 'cancelled'],
          completed: [],
          cancelled: [],
        };

        const allowed = allowedTransitions[gig.status] || [];

        if (!allowed.includes(status)) {
          rejectRequest(
            409,
            `Cannot change a ${gig.status} gig to ${status}.`
          );
        }

        if (status === 'completed' && !gig.assignedFreelancer) {
          rejectRequest(
            409,
            'A gig must have an assigned freelancer before completion.'
          );
        }

        const updated = await Gig.findOneAndUpdate(
          {
            _id: gig._id,
            status: gig.status,
          },
          {
            $set: { status },
            $inc: { __v: 1 },
          },
          {
            new: true,
            runValidators: true,
            session,
          }
        );

        if (!updated) {
          rejectRequest(409, 'The gig changed. Refresh and try again.');
        }

        if (status === 'cancelled') {
          await Application.updateMany(
            {
              gigId: gig._id,
              status: 'pending',
            },
            {
              $set: { status: 'rejected' },
            },
            { session }
          );
        }

        return updated;
      }
    );

    return res.json({
      message: `Gig ${status} successfully.`,
      gig: updatedGig,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error('Gig status update failed:', error.name);

    return res.status(500).json({
      error: 'Failed to update gig status.',
    });
  }
});

// Delete a gig owned by the current user, or moderate it as an admin.
router.delete('/:id', auth, async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({
      error: 'Invalid gig ID.'
    });
  }

  try {
    await mongoose.connection.transaction(async (session) => {
      const gig = await Gig.findById(req.params.id).session(session);

      if (!gig) {
        const error = new Error('Gig not found.');
        error.status = 404;
        throw error;
      }

      const isOwner = gig.posterId.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        const error = new Error('Not authorized to delete this gig.');
        error.status = 403;
        throw error;
      }

      await Gig.deleteOne({ _id: gig._id }, { session });

      await Application.deleteMany(
        { gigId: gig._id },
        { session }
      );
    });

    return res.json({
      message: 'Gig and associated applications deleted successfully.'
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : 'Server error while deleting the gig.'
    });
  }
});

module.exports = router;