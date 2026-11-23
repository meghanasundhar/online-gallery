
const express = require('express');
const { body, validationResult } = require('express-validator');
const Artwork = require('../models/Artwork');
const { authMiddleware, allowRoles } = require('../middleware/authMiddleware');

function createArtworkRouter() {
  const router = express.Router();

  // Allow public requests while supporting optional login.
  function optionalAuth(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return next();
    }

    return authMiddleware(req, res, next);
  }

  // Check validation errors.
  function validateRequest(req, res) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({
        message: errors.array()[0].msg,
      });
      return false;
    }

    return true;
  }

  // ==========================================
  // 1. GET ALL ARTWORKS (PUBLIC)
  // ==========================================
  router.get('/', optionalAuth, async (req, res) => {
    try {
      const filter = {};

      if (req.user?.role === 'artist') {
        filter.artistId = req.user.userId;
      } else if (req.user?.role !== 'admin') {
        filter.status = { $in: ['Approved', 'Published'] };
      }

      const artworks = await Artwork.find(filter)
        .sort({ createdAt: -1 });

      return res.json({ artworks });
    } catch (error) {
      console.error('Get artworks error:', error);
      return res.status(500).json({
        message: 'Could not retrieve artworks.',
      });
    }
  });

  // ==========================================
  // 2. ADMIN - GET PENDING ARTWORKS
  // ==========================================
  router.get(
    '/admin/pending',
    authMiddleware,
    allowRoles('admin'),
    async (req, res) => {
      try {
        const artworks = await Artwork.find({
          status: 'Pending',
        }).sort({ createdAt: -1 });

        return res.json({ artworks });
      } catch (error) {
        console.error('Pending artworks error:', error);
        return res.status(500).json({
          message: 'Could not retrieve pending artworks.',
        });
      }
    }
  );

  // ==========================================
  // 3. ADMIN - APPROVE ARTWORK
  // ==========================================
  router.patch(
    '/admin/:id/approve',
    authMiddleware,
    allowRoles('admin'),
    async (req, res) => {
      try {
        const artwork = await Artwork.findById(req.params.id);

        if (!artwork) {
          return res.status(404).json({
            message: 'Artwork not found.',
          });
        }

        artwork.status = 'Approved';
        artwork.rejectionReason = '';

        await artwork.save();

        return res.json({
          message: 'Artwork approved successfully.',
          artwork,
        });
      } catch (error) {
        console.error('Approve artwork error:', error);
        return res.status(400).json({
          message: 'Could not approve artwork.',
        });
      }
    }
  );

  // ==========================================
  // 4. ADMIN - REJECT ARTWORK
  // ==========================================
  router.patch(
    '/admin/:id/reject',
    authMiddleware,
    allowRoles('admin'),
    [
      body('reason')
        .isString()
        .trim()
        .isLength({ min: 1, max: 500 }),
    ],
    async (req, res) => {
      if (!validateRequest(req, res)) return;

      try {
        const artwork = await Artwork.findById(req.params.id);

        if (!artwork) {
          return res.status(404).json({
            message: 'Artwork not found.',
          });
        }

        artwork.status = 'Rejected';
        artwork.rejectionReason = req.body.reason.trim();

        await artwork.save();

        return res.json({
          message: 'Artwork rejected successfully.',
          artwork,
        });
      } catch (error) {
        console.error('Reject artwork error:', error);
        return res.status(400).json({
          message: 'Could not reject artwork.',
        });
      }
    }
  );

  // ==========================================
  // 5. GET SINGLE ARTWORK (PUBLIC)
  // ==========================================
  router.get('/:id', optionalAuth, async (req, res) => {
    try {
      const artwork = await Artwork.findById(req.params.id);

      if (!artwork) {
        return res.status(404).json({
          message: 'Artwork not found.',
        });
      }

      const isOwner = req.user?.role === 'artist'
        && String(artwork.artistId) === req.user.userId;

      const isAdmin = req.user?.role === 'admin';

      const isPublic = ['Approved', 'Published'].includes(
        artwork.status
      );

      if (!isPublic && !isOwner && !isAdmin) {
        return res.status(403).json({
          message: 'Access denied.',
        });
      }

      return res.json({ artwork });
    } catch (error) {
      console.error('Get artwork error:', error);
      return res.status(400).json({
        message: 'Invalid artwork ID.',
      });
    }
  });

  // ==========================================
  // 6. ARTIST - CREATE ARTWORK
  // ==========================================
  router.post(
    '/',
    authMiddleware,
    allowRoles('artist'),
    [
      body('title')
        .isString()
        .trim()
        .isLength({ min: 1, max: 150 }),

      body('category')
        .isString()
        .trim()
        .notEmpty(),

      body('price')
        .isFloat({ min: 0 }),

      body('image')
        .isURL({ protocols: ['http', 'https'] }),

      body('description')
        .optional()
        .isString()
        .isLength({ max: 2000 }),
    ],
    async (req, res) => {
      if (!validateRequest(req, res)) return;

      try {
        const artwork = await Artwork.create({
          title: req.body.title,
          artist: req.authUser.name,
          artistId: req.authUser._id,
          category: req.body.category,
          price: Number(req.body.price),
          image: req.body.image,
          description: req.body.description || '',
          status: 'Pending',
        });

        return res.status(201).json({
          message: 'Artwork submitted successfully.',
          artwork,
        });
      } catch (error) {
        console.error('Create artwork error:', error);
        return res.status(500).json({
          message: 'Could not create artwork.',
        });
      }
    }
  );

  // ==========================================
  // 7. ARTIST - UPDATE OWN ARTWORK
  // ==========================================
  router.put(
    '/:id',
    authMiddleware,
    allowRoles('artist'),
    [
      body('title')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 150 }),

      body('category')
        .optional()
        .isString()
        .trim()
        .notEmpty(),

      body('price')
        .optional()
        .isFloat({ min: 0 }),

      body('image')
        .optional()
        .isURL({ protocols: ['http', 'https'] }),

      body('description')
        .optional()
        .isString()
        .isLength({ max: 2000 }),
    ],
    async (req, res) => {
      if (!validateRequest(req, res)) return;

      try {
        const artwork = await Artwork.findOne({
          _id: req.params.id,
          artistId: req.user.userId,
        });

        if (!artwork) {
          return res.status(404).json({
            message: 'Artwork not found.',
          });
        }

        const fields = [
          'title',
          'category',
          'price',
          'image',
          'description',
        ];

        fields.forEach((field) => {
          if (req.body[field] !== undefined) {
            artwork[field] = field === 'price'
              ? Number(req.body[field])
              : req.body[field];
          }
        });

        // Updated artwork requires admin approval again.
        artwork.status = 'Pending';
        artwork.rejectionReason = '';

        await artwork.save();

        return res.json({
          message: 'Artwork updated successfully.',
          artwork,
        });
      } catch (error) {
        console.error('Update artwork error:', error);
        return res.status(400).json({
          message: 'Could not update artwork.',
        });
      }
    }
  );

  // ==========================================
  // 8. ARTIST - DELETE OWN ARTWORK
  // ==========================================
  router.delete(
    '/:id',
    authMiddleware,
    allowRoles('artist'),
    async (req, res) => {
      try {
        const artwork = await Artwork.findOneAndDelete({
          _id: req.params.id,
          artistId: req.user.userId,
        });

        if (!artwork) {
          return res.status(404).json({
            message: 'Artwork not found.',
          });
        }

        return res.json({
          message: 'Artwork deleted successfully.',
        });
      } catch (error) {
        console.error('Delete artwork error:', error);
        return res.status(400).json({
          message: 'Could not delete artwork.',
        });
      }
    }
  );

  return router;
}

module.exports = createArtworkRouter;
