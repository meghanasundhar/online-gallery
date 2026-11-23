
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');

function sendValidationError(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  return res.status(400).json({ message: errors.array()[0].msg });
}

function createAuthRouter({ loginLimiter, registerLimiter } = {}) {
  const router = express.Router();

  router.post('/register', registerLimiter, [
    body('name').isString().withMessage('Name is required.').bail().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1 to 100 characters.'),
    body('email').isString().withMessage('A valid email is required.').bail().trim().isEmail().withMessage('Enter a valid email address.').bail().isLength({ max: 254 }).withMessage('Email must be at most 254 characters.'),
    body('password').isString().withMessage('Password is required.').bail().isLength({ min: 8, max: 128 }).withMessage('Password must be 8 to 128 characters.'),
    body('role').optional().isIn(['visitor', 'artist']).withMessage('Public registration is limited to Visitor and Artist roles.'),
  ], async (req, res) => {
    if (sendValidationError(req, res)) return;

    try {
      const { name, email, password } = req.body;
      const role = req.body.role ?? 'visitor';
      const normalizedEmail = email.toLowerCase();

      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role,
      });

      return res.status(201).json({
        message: 'Registration successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }
      console.error('Registration error:', error.message);
      return res.status(500).json({ message: 'Registration failed' });
    }
  });

  router.post('/login', loginLimiter, [
    body('email').isString().withMessage('A valid email is required.').bail().trim().isEmail().withMessage('Enter a valid email address.').bail().isLength({ max: 254 }).withMessage('Email must be at most 254 characters.'),
    body('password').isString().withMessage('Password is required.').bail().isLength({ min: 1, max: 128 }).withMessage('Password must be at most 128 characters.'),
  ], async (req, res) => {
    if (sendValidationError(req, res)) return;

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }
      if (user.isActive === false) {
        return res.status(403).json({ message: 'This account is inactive.' });
      }

      const token = jwt.sign(
        { userId: user._id.toString(), role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      console.error('Login error:', error.message);
      return res.status(500).json({ message: 'Login failed' });
    }
  });

  router.get('/me', authMiddleware, async (req, res) => {
    try {
      const user = req.authUser;
      if (!user) return res.status(401).json({ message: 'User account not found' });

      return res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      console.error('Current user lookup failed:', error.message);
      return res.status(500).json({ message: 'Could not retrieve user' });
    }
  });

  return router;
}

module.exports = createAuthRouter;
