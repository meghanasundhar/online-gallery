require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const { createApp } = require('./app');

const app = express();

let connectionPromise;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI)
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  await connectionPromise;
}

app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    res.status(500).json({
      message: 'Database connection failed',
    });
  }
});

app.use(createApp());

module.exports = app;