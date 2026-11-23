
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const createAuthRouter = require('./routes/authRoutes');
const createArtInstituteRouter = require('./routes/artInstituteRoutes');
const createArtworkRouter = require('./routes/artworkRoutes');

function parseAllowedOrigins() {
  const configuredOrigins = process.env.CORS_ORIGINS;

  const originList = configuredOrigins ?? (
    process.env.NODE_ENV === 'production'
      ? ''
      : 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175'
  );

  const origins = originList
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production' && origins.length === 0) {
    throw new Error(
      'CORS_ORIGINS must contain the deployed frontend origin in production.'
    );
  }

  return origins;
}

function createAuthLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message },
  });
}

function createApp({ authRateLimits = {}, artInstituteFetch = fetch } = {}) {
  const app = express();
  const allowedOrigins = parseAllowedOrigins();

  const loginLimiter = createAuthLimiter({
    windowMs: authRateLimits.windowMs ?? 15 * 60 * 1000,
    limit: authRateLimits.loginLimit ?? Number(process.env.AUTH_LOGIN_LIMIT ?? 10),
    message: 'Too many login attempts. Please try again later.',
  });

  const registerLimiter = createAuthLimiter({
    windowMs: authRateLimits.windowMs ?? 60 * 60 * 1000,
    limit: authRateLimits.registerLimit ?? Number(process.env.AUTH_REGISTER_LIMIT ?? 5),
    message: 'Too many registration attempts. Please try again later.',
  });

  app.disable('x-powered-by');

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Parse JSON request bodies
  app.use(express.json({ limit: '16kb' }));

  // Health check
  app.get('/', (req, res) => {
    res.json({
      message: 'Online Art Gallery API is running',
    });
  });

  // Authentication routes
  app.use(
    '/api/auth',
    createAuthRouter({
      loginLimiter,
      registerLimiter,
    })
  );

  // Art Institute external API
  app.use(
    '/api/art-institute',
    createArtInstituteRouter({
      fetchImpl: artInstituteFetch,
    })
  );

  // Artwork MongoDB API
  app.use(
    '/api/artworks',
    createArtworkRouter()
  );

  return app;
}

module.exports = { createApp };
