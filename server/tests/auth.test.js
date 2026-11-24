
require('dotenv').config();

const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const mongoose = require('mongoose');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createApp } = require('../app');
const { allowRoles, authMiddleware } = require('../middleware/authMiddleware');

const testDatabaseName = `aga_test_${process.pid}_${Date.now()}`;
const configuredMongoUri = process.env.MONGODB_URI;

if (!configuredMongoUri) {
  throw new Error('MONGODB_URI is required to run auth integration tests.');
}

const testUserPrefix = `auth-test-${process.pid}-${Date.now()}`;
const visitorEmail = `${testUserPrefix}-visitor@example.invalid`;
const artistEmail = `${testUserPrefix}-artist@example.invalid`;
const visitorPassword = 'VisitorIntegration!2026';
const artistPassword = 'ArtistIntegration!2026';

let apiServer;
let apiBaseUrl;
let rateServer;
let rateBaseUrl;
let roleServer;
let roleBaseUrl;
let visitorId;
let visitorToken;
let artistId;
let artistToken;

async function listen(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  return {
    server,
    url: `http://127.0.0.1:${server.address().port}`,
  };
}

async function jsonRequest(baseUrl, route, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  return {
    response,
    data: await response.json().catch(() => ({})),
  };
}

test.before(async () => {
  await mongoose.connect(configuredMongoUri, {
    dbName: testDatabaseName,
    serverSelectionTimeoutMS: 10000,
  });

  const api = await listen(
    createApp({
      authRateLimits: {
        loginLimit: 50,
        registerLimit: 50,
      },
    })
  );

  apiServer = api.server;
  apiBaseUrl = api.url;

  const rate = await listen(
    createApp({
      authRateLimits: {
        loginLimit: 2,
        registerLimit: 2,
        windowMs: 60000,
      },
    })
  );

  rateServer = rate.server;
  rateBaseUrl = rate.url;

  const roleApp = express();

  roleApp.get(
    '/artist-only',
    authMiddleware,
    allowRoles('artist'),
    (req, res) => res.json({ role: req.user.role })
  );

  roleServer = (await listen(roleApp)).server;
  roleBaseUrl = `http://127.0.0.1:${roleServer.address().port}`;
});

test.after(async () => {
  await Promise.all(
    [apiServer, rateServer, roleServer]
      .filter(Boolean)
      .map((server) => new Promise((resolve) => server.close(resolve)))
  );

  if (mongoose.connection.readyState) {
    await User.deleteMany({
      email: { $regex: /^auth-test-/ },
    });

    await mongoose.disconnect();
  }
});

test('security headers are sent by the API app', async () => {
  const { response } = await jsonRequest(apiBaseUrl, '/');

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(response.headers.get('content-security-policy'));

  const allowedOrigin = await fetch(`${apiBaseUrl}/`, {
    headers: { Origin: 'http://localhost:5173' },
  });

  assert.equal(
    allowedOrigin.headers.get('access-control-allow-origin'),
    'http://localhost:5173'
  );

  const disallowedOrigin = await fetch(`${apiBaseUrl}/`, {
    headers: { Origin: 'https://untrusted.example' },
  });

  assert.equal(
    disallowedOrigin.headers.get('access-control-allow-origin'),
    null
  );
});

test('registers visitor and artist accounts with hashed passwords and active default', async () => {
  const visitorResult = await jsonRequest(apiBaseUrl, '/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Test Visitor',
      email: visitorEmail,
      password: visitorPassword,
      role: 'visitor',
    },
  });

  assert.equal(visitorResult.response.status, 201);
  assert.equal(visitorResult.data.user.role, 'visitor');
  visitorId = String(visitorResult.data.user.id);

  const artistResult = await jsonRequest(apiBaseUrl, '/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Test Artist',
      email: artistEmail,
      password: artistPassword,
      role: 'artist',
    },
  });

  assert.equal(artistResult.response.status, 201);
  assert.equal(artistResult.data.user.role, 'artist');
  artistId = String(artistResult.data.user.id);

  const storedVisitor = await User.findById(visitorId).select('+password');

  assert.equal(storedVisitor.isActive, true);
  assert.notEqual(storedVisitor.password, visitorPassword);
  assert.equal(
    await bcrypt.compare(visitorPassword, storedVisitor.password),
    true
  );
});

test('rejects invalid input and prevents public Admin registration', async () => {
  const adminAttempt = await jsonRequest(apiBaseUrl, '/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Not Admin',
      email: `${testUserPrefix}-admin@example.invalid`,
      password: 'SecurePassword!2026',
      role: 'admin',
    },
  });

  assert.equal(adminAttempt.response.status, 400);

  const invalidEmail = await jsonRequest(apiBaseUrl, '/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'SecurePassword!2026',
      role: 'visitor',
    },
  });

  assert.equal(invalidEmail.response.status, 400);

  const longName = await jsonRequest(apiBaseUrl, '/api/auth/register', {
    method: 'POST',
    body: {
      name: 'n'.repeat(101),
      email: `${testUserPrefix}-long@example.invalid`,
      password: 'SecurePassword!2026',
      role: 'visitor',
    },
  });

  assert.equal(longName.response.status, 400);

  const shortPassword = await jsonRequest(apiBaseUrl, '/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Short Password',
      email: `${testUserPrefix}-short@example.invalid`,
      password: 'short',
      role: 'visitor',
    },
  });

  assert.equal(shortPassword.response.status, 400);
});

test('login issues JWTs, rejects bad passwords, and /me requires a valid bearer token', async () => {
  const visitorLogin = await jsonRequest(apiBaseUrl, '/api/auth/login', {
    method: 'POST',
    body: {
      email: visitorEmail,
      password: visitorPassword,
    },
  });

  assert.equal(visitorLogin.response.status, 200);
  assert.ok(visitorLogin.data.token);
  visitorToken = visitorLogin.data.token;

  const artistLogin = await jsonRequest(apiBaseUrl, '/api/auth/login', {
    method: 'POST',
    body: {
      email: artistEmail,
      password: artistPassword,
    },
  });

  assert.equal(artistLogin.response.status, 200);
  artistToken = artistLogin.data.token;

  const invalidLogin = await jsonRequest(apiBaseUrl, '/api/auth/login', {
    method: 'POST',
    body: {
      email: visitorEmail,
      password: 'wrong-password',
    },
  });

  assert.equal(invalidLogin.response.status, 401);

  const me = await jsonRequest(apiBaseUrl, '/api/auth/me', {
    token: visitorToken,
  });

  assert.equal(me.response.status, 200);
  assert.equal(String(me.data.user.id ?? me.data.user._id), visitorId);
  assert.equal(me.data.user.role, 'visitor');
  assert.equal(Object.hasOwn(me.data.user, 'password'), false);

  const invalidToken = await jsonRequest(apiBaseUrl, '/api/auth/me', {
    token: 'not-a-valid-jwt',
  });

  assert.equal(invalidToken.response.status, 401);

  const malformedSubjectToken = jwt.sign(
    { userId: 'not-an-object-id' },
    process.env.JWT_SECRET,
    { expiresIn: '1m' }
  );

  const malformedSubject = await jsonRequest(apiBaseUrl, '/api/auth/me', {
    token: malformedSubjectToken,
  });

  assert.equal(malformedSubject.response.status, 401);
});

test('protected role checks use the current MongoDB role and account status', async () => {
  const visitorDenied = await jsonRequest(
    roleBaseUrl,
    '/artist-only',
    { token: visitorToken }
  );

  assert.equal(visitorDenied.response.status, 403);

  const artistAllowed = await jsonRequest(
    roleBaseUrl,
    '/artist-only',
    { token: artistToken }
  );

  assert.equal(artistAllowed.response.status, 200);

  await User.updateOne(
    { _id: artistId },
    { $set: { role: 'visitor' } }
  );

  const staleArtistTokenDenied = await jsonRequest(
    roleBaseUrl,
    '/artist-only',
    { token: artistToken }
  );

  assert.equal(staleArtistTokenDenied.response.status, 403);

  await User.updateOne(
    { _id: artistId },
    { $set: { role: 'artist' } }
  );

  await User.updateOne(
    { _id: visitorId },
    { $set: { isActive: false } }
  );

  const disabledLogin = await jsonRequest(apiBaseUrl, '/api/auth/login', {
    method: 'POST',
    body: {
      email: visitorEmail,
      password: visitorPassword,
    },
  });

  assert.equal(disabledLogin.response.status, 403);

  const disabledMe = await jsonRequest(apiBaseUrl, '/api/auth/me', {
    token: visitorToken,
  });

  assert.equal(disabledMe.response.status, 403);
});

test('login and registration endpoints are rate limited', async () => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await jsonRequest(rateBaseUrl, '/api/auth/login', {
      method: 'POST',
      body: {
        email: `rate-${attempt}@example.invalid`,
        password: 'wrong-password',
      },
    });

    assert.equal(result.response.status, 401);
  }

  const limitedLogin = await jsonRequest(rateBaseUrl, '/api/auth/login', {
    method: 'POST',
    body: {
      email: 'rate-third@example.invalid',
      password: 'wrong-password',
    },
  });

  assert.equal(limitedLogin.response.status, 429);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await jsonRequest(rateBaseUrl, '/api/auth/register', {
      method: 'POST',
      body: {
        name: '',
        email: `bad-${attempt}`,
        password: 'short',
        role: 'visitor',
      },
    });

    assert.equal(result.response.status, 400);
  }

  const limitedRegistration = await jsonRequest(
    rateBaseUrl,
    '/api/auth/register',
    {
      method: 'POST',
      body: {
        name: '',
        email: 'bad-third',
        password: 'short',
        role: 'visitor',
      },
    }
  );

  assert.equal(limitedRegistration.response.status, 429);
});
