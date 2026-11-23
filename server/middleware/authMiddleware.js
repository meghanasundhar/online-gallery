
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authorization.split(' ')[1];
  let claims;

  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired token',
    });
  }

  const userId = claims.userId ?? claims.sub;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  try {
    const user = await User.findById(userId).select('name email role isActive');
    if (!user) return res.status(401).json({ message: 'User account not found' });
    if (user.isActive === false) return res.status(403).json({ message: 'This account is inactive.' });

    req.authUser = user;
    req.user = { userId: String(user._id), role: user.role };
    return next();
  } catch {
    return res.status(503).json({ message: 'Authentication service unavailable.' });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    const currentRole = String(req.user?.role ?? '').toLowerCase();
    if (!currentRole || !roles.some((role) => String(role).toLowerCase() === currentRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
}

module.exports = { authMiddleware, allowRoles };
