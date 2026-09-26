const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gig = require('../models/Gig');

// Create a new gig (Protected Route)
router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, category, budget, deadline } = req.body;

    const newGig = new Gig({
      posterId: req.user.id, // This comes directly from the verified JWT token
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

// Get all open gigs (Public Route)
router.get('/all', async (req, res) => {
  try {
    // Fetches open gigs, newest first, and attaches the poster's name and faculty
    const gigs = await Gig.find({ status: 'open' })
      .sort({ createdAt: -1 })
      .populate('posterId', 'name faculty');
      
    res.json(gigs);
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching gigs.' });
  }
});

// Delete a gig (Protected Route)
router.delete('/:id', auth, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    // Verify the user owns this gig
    if (gig.posterId._id.toString() !== req.user.id) {
      return res.status(401).json({ error: 'User not authorized to delete this gig' });
    }

    await gig.deleteOne();
    res.json({ message: 'Gig deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error while deleting the gig.' });
  }
});

module.exports = router;