const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Preserve the current Ruhuna-only freelancer registration rule.
const isRuhunaEmail = (email) => {
  return /^[^@\s]+@(eng\.ruh\.ac\.lk|ruh\.ac\.lk)$/.test(email);
};

const canSwitchRole = (user) => {
  return user.userType === 'student' || user.role === 'admin';
};

// Explicitly select fields that may be sent to the frontend.
const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  faculty: user.faculty,
  role: user.role,
  userType: user.userType,
  activeRole: user.activeRole,
  studentId: user.studentId,
  isVerifiedStudent: user.isVerifiedStudent,
  skills: user.skills,
  bio: user.bio,
  rating: user.rating,
  reviewCount: user.reviewCount,
  canSwitchRole: canSwitchRole(user)
});

// Register a customer or student account.
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      faculty,
      role,
      userType,
      studentId,
      skills
    } = req.body || {};

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        error: 'Name, email, and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        error: 'Enter a valid email address.'
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        error: 'Password must have at least 8 characters and at most 72 bytes.'
      });
    }

    if (faculty !== undefined && typeof faculty !== 'string') {
      return res.status(400).json({
        error: 'Faculty must be text.'
      });
    }

    // Public registration cannot create administrator accounts.
    if (
      (role !== undefined &&
        !['freelancer', 'customer'].includes(role)) ||
      (userType !== undefined &&
        !['student', 'client'].includes(userType))
    ) {
      return res.status(400).json({
        error: 'Invalid registration account type.'
      });
    }

    // Support both the existing role field and the future userType field.
    const selectedType =
      userType || (role === 'freelancer' ? 'student' : 'client');

    const selectedRole =
      selectedType === 'student' ? 'freelancer' : 'customer';

    if (role !== undefined && role !== selectedRole) {
      return res.status(400).json({
        error: 'Role and account type do not match.'
      });
    }

    if (selectedType === 'student' && !isRuhunaEmail(cleanEmail)) {
      return res.status(400).json({
        error: 'Student accounts require a University of Ruhuna email.'
      });
    }

    let cleanStudentId = '';
    let cleanSkills = [];

    if (selectedType === 'student') {
      if (studentId !== undefined) {
        if (typeof studentId !== 'string' || studentId.length > 50) {
          return res.status(400).json({
            error: 'Student ID must be text of at most 50 characters.'
          });
        }

        cleanStudentId = studentId.trim();
      }

      if (skills !== undefined) {
        let values;

        if (typeof skills === 'string') {
          values = skills.split(',');
        } else if (
          Array.isArray(skills) &&
          skills.every((skill) => typeof skill === 'string')
        ) {
          values = skills;
        } else {
          return res.status(400).json({
            error: 'Skills must be text or an array of strings.'
          });
        }

        cleanSkills = [
          ...new Set(values.map((skill) => skill.trim()).filter(Boolean))
        ];

        if (
          cleanSkills.length > 20 ||
          cleanSkills.some((skill) => skill.length > 50)
        ) {
          return res.status(400).json({
            error: 'Use at most 20 skills, each at most 50 characters.'
          });
        }
      }
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: selectedRole,
      userType: selectedType,
      activeRole: selectedRole,
      faculty:
        selectedType === 'student'
          ? (faculty?.trim() || '')
          : 'Public / External Client',
      studentId: cleanStudentId,
      skills: cleanSkills,
      isVerifiedStudent: false,
      isBanned: false
    }); 

    return res.status(201).json({
      message: 'Account registered successfully!',
      userType: user.userType,
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'An account with this email already exists.'
      });
    }

    return res.status(500).json({
      error: 'Server error during registration.'
    });
  }
});

// Log in and optionally select a mode.
router.post('/login', async (req, res) => {
  try {
    const { email, password, loginMode } = req.body || {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: 'Email and password are required.'
      });
    }

    if (
      loginMode !== undefined &&
      !['freelancer', 'customer'].includes(loginMode)
    ) {
      return res.status(400).json({
        error: 'Invalid login mode.'
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        error: 'Invalid email or password.'
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        error: 'Your account has been suspended.'
      });
    }

    if (loginMode === 'freelancer' && !canSwitchRole(user)) {
      return res.status(403).json({
        error: 'Client accounts cannot use freelancer mode.'
      });
    }

    if (loginMode && user.activeRole !== loginMode) {
      user.activeRole = loginMode;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d', algorithm: 'HS256' }
    );

    return res.json({
      token,
      activeMode: user.activeRole,
      user: publicUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Server error during login.'
    });
  }
});

// Return the current user's profile.
router.get('/me', auth, (req, res) => {
  return res.json({
    user: publicUser(req.userDetails)
  });
});

// Change the selected mode without changing permanent permissions.
router.put('/switch-role', auth, async (req, res) => {
  try {
    const user = req.userDetails;
    const { targetRole } = req.body || {};

    if (!canSwitchRole(user)) {
      return res.status(403).json({
        error: 'Only student or admin accounts can switch modes.'
      });
    }

    if (!['freelancer', 'customer'].includes(targetRole)) {
      return res.status(400).json({
        error: 'targetRole must be freelancer or customer.'
      });
    }

    user.activeRole = targetRole;
    await user.save();

    return res.json({
      message: `Switched to ${targetRole} mode.`,
      activeRole: user.activeRole,
      user: publicUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to switch account mode.'
    });
  }
});

// Update only explicitly permitted profile fields.
router.put('/profile', auth, async (req, res) => {
  try {
    const user = req.userDetails;
    const { skills, bio, faculty } = req.body || {};

    if (skills === undefined && bio === undefined && faculty === undefined) {
      return res.status(400).json({
        error: 'Provide skills, bio, or faculty to update.'
      });
    }

    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.length > 1000) {
        return res.status(400).json({
          error: 'Bio must be text of at most 1000 characters.'
        });
      }

      user.bio = bio.trim();
    }

    if (skills !== undefined) {
      let values;

      if (typeof skills === 'string') {
        values = skills.split(',');
      } else if (
        Array.isArray(skills) &&
        skills.every((skill) => typeof skill === 'string')
      ) {
        values = skills;
      } else {
        return res.status(400).json({
          error: 'Skills must be text or an array of strings.'
        });
      }

      const cleanedSkills = [
        ...new Set(values.map((skill) => skill.trim()).filter(Boolean))
      ];

      if (
        cleanedSkills.length > 20 ||
        cleanedSkills.some((skill) => skill.length > 50)
      ) {
        return res.status(400).json({
          error: 'Use at most 20 skills, each at most 50 characters.'
        });
      }

      user.skills = cleanedSkills;
    }

    if (faculty !== undefined) {
      if (typeof faculty !== 'string' || faculty.length > 120) {
        return res.status(400).json({
          error: 'Faculty must be text of at most 120 characters.'
        });
      }

      if (user.userType === 'student') {
        user.faculty = faculty.trim();
      }
    }

    await user.save();

    return res.json({
      message: 'Profile updated successfully.',
      user: publicUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to update profile.'
    });
  }
});

module.exports = router;