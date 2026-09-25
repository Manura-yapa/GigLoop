const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from the request header
  const token = req.header('x-auth-token');

  // Check if no token is provided
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied.' });
  }

  // Verify the token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attaches the user ID to the request
    next(); // Moves to the actual route handler
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid.' });
  }
};