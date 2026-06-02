const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, pin } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
  }

  try {
    const pinHash = await bcrypt.hash(pin, 10);
    const stmt = db.prepare('INSERT INTO users (name, pin_hash) VALUES (?, ?)');
    const result = stmt.run(name.trim(), pinHash);

    const user = db.prepare('SELECT id, name, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken(user.id);

    res.status(201).json({ token, user });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Name already taken' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { name, pin } = req.body;

  if (!name || !pin) {
    return res.status(400).json({ error: 'Name and PIN are required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid name or PIN' });
    }

    const valid = await bcrypt.compare(pin, user.pin_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid name or PIN' });
    }

    const token = generateToken(user.id);
    const { pin_hash, strava_access_token, strava_refresh_token, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(
    'SELECT id, name, strava_athlete_id, created_at FROM users WHERE id = ?'
  ).get(req.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

module.exports = router;
