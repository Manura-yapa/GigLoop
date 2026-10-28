const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  let token = req.header('x-auth-token');

  // Also support the standard Authorization: Bearer <token> header.
  if (!token) {
    const authorization = req.header('authorization');

    if (authorization?.startsWith('Bearer ')) {
      token = authorization.slice(7).trim();
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'No token, authorization denied.'
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      error: 'Authentication is not configured.'
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
  } catch (error) {
    return res.status(401).json({
      error: 'Token is invalid or expired.'
    });
  }

  if (
    typeof decoded.id !== 'string' ||
    !mongoose.isObjectIdOrHexString(decoded.id)
  ) {
    return res.status(401).json({
      error: 'Invalid token user.'
    });
  }

  try {
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        error: 'User account no longer exists.'
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        error: 'Your account has been suspended.'
      });
    }

    // Use current database values, not potentially outdated JWT roles.
    req.user = {
      id: user._id.toString(),
      role: user.role,
      userType: user.userType,
      activeRole: user.activeRole
    };

    req.userDetails = user;
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to check your account.'
    });
  }

  return next();
};