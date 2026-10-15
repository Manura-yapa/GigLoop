const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gig = require('../models/Gig');

// Create a new gig (Protected Route)
router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, category, budget, deadline } = req.body;

    const newGig = new Gig({
      posterId: req.user.id,
      title,
      description,
      category,
      budget,
      deadline
    });

    const gig = await newGig.save();
    res.status(201).json({ message: 'Gig created successfully', gig });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating the gig.' });
  }
});

// Get all gigs (Public Route)
router.get('/all', async (req, res) => {
  try {
    const gigs = await Gig.find()
      .sort({ createdAt: -1 })
      .populate('posterId', 'name faculty role');
      
    res.json(gigs);
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching gigs.' });
  }
});

// Update gig status (Creator or Admin)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    if (gig.posterId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ error: 'Not authorized to update this gig' });
    }

    gig.status = status;
    await gig.save();
    res.json({ message: 'Gig status updated', gig });
  } catch (error) {
    res.status(500).json({ error: 'Server error while updating gig status.' });
  }
});

// Delete a gig (Creator or Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    // Allow deletion if the user is the creator OR an Admin
    if (gig.posterId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ error: 'User not authorized to delete this gig' });
    }

    await gig.deleteOne();
    res.json({ message: 'Gig deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error while deleting the gig.' });
  }
});

module.exports = router;