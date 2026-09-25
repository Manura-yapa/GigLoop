const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register a new student
router.post('/register', async (req, res) => {

    

  try {
    const { name, email, password, faculty } = req.body;
    

    // 1. Restrict to Ruhuna emails
    if (!email.endsWith('@eng.ruh.ac.lk') && !email.endsWith('@ruh.ac.lk')) {
      return res.status(403).json({ error: 'Only University of Ruhuna emails are allowed.' });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Save the user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      faculty
    });
    
    await newUser.save();
    res.status(201).json({ message: 'Student registered successfully!' });

  } catch (error) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login student
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // 3. Generate JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        faculty: user.faculty
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;