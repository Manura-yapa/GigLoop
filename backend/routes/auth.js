const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const isRuhunaEmail = (email) => {
  return email.endsWith('@eng.ruh.ac.lk') || email.endsWith('@ruh.ac.lk');
};

// Register User (Freelancer or Customer)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, faculty, role } = req.body;
    const selectedRole = role || 'customer';

    // 1. If registering as a Freelancer, strictly require Ruhuna email
    if (selectedRole === 'freelancer' && !isRuhunaEmail(email)) {
      return res.status(403).json({ 
        error: 'Freelancers must register with a University of Ruhuna email (@eng.ruh.ac.lk or @ruh.ac.lk).' 
      });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Save the user (First user or admin@ruh.ac.lk can be made admin easily)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: email === 'admin@eng.ruh.ac.lk' ? 'admin' : selectedRole,
      faculty: selectedRole === 'freelancer' ? faculty : (faculty || 'Public / External Client')
    });
    
    await newUser.save();
    res.status(201).json({ message: 'Account registered successfully!' });

  } catch (error) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login User with Mode Selection
router.post('/login', async (req, res) => {
  try {
    const { email, password, loginMode } = req.body;

    // 1. Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // 3. Prevent public customers from logging in as Freelancers
    const canBeFreelancer = user.role === 'freelancer' || user.role === 'admin' || isRuhunaEmail(user.email);
    if (loginMode === 'freelancer' && !canBeFreelancer) {
      return res.status(403).json({ 
        error: 'Only verified University of Ruhuna students can log in as Freelancers. Please select Customer mode.' 
      });
    }

    // 4. Generate JWT Token including role
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    const activeMode = loginMode || (user.role === 'freelancer' ? 'freelancer' : 'customer');

    res.json({
      token,
      activeMode,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        faculty: user.faculty,
        role: user.role,
        canSwitchRole: canBeFreelancer
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;