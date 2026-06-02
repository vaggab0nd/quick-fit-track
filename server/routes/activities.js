const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/activities
router.get('/', authMiddleware, (req, res) => {
  const activities = db.prepare(
    'SELECT * FROM activities WHERE user_id = ? ORDER BY activity_date DESC, created_at DESC'
  ).all(req.userId);

  res.json({ activities });
});

// POST /api/activities
router.post('/', authMiddleware, (req, res) => {
  const { type, distance_km, duration_seconds, elevation_m, activity_date } = req.body;

  if (!type || !['run', 'cycle', 'walk'].includes(type)) {
    return res.status(400).json({ error: 'Type must be run, cycle, or walk' });
  }

  if (!distance_km || isNaN(distance_km) || Number(distance_km) <= 0) {
    return res.status(400).json({ error: 'distance_km must be a positive number' });
  }

  if (!duration_seconds || isNaN(duration_seconds) || Number(duration_seconds) <= 0) {
    return res.status(400).json({ error: 'duration_seconds must be a positive number' });
  }

  if (!activity_date || !/^\d{4}-\d{2}-\d{2}$/.test(activity_date)) {
    return res.status(400).json({ error: 'activity_date must be in YYYY-MM-DD format' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO activities (user_id, type, distance_km, duration_seconds, elevation_m, activity_date, source)
      VALUES (?, ?, ?, ?, ?, ?, 'manual')
    `);

    const result = stmt.run(
      req.userId,
      type,
      Number(distance_km),
      Number(duration_seconds),
      Number(elevation_m || 0),
      activity_date
    );

    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ activity });
  } catch (err) {
    console.error('Create activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/activities/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const activityId = parseInt(req.params.id, 10);
  if (isNaN(activityId)) {
    return res.status(400).json({ error: 'Invalid activity ID' });
  }

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  if (activity.user_id !== req.userId) {
    return res.status(403).json({ error: 'Not authorized to delete this activity' });
  }

  db.prepare('DELETE FROM activities WHERE id = ?').run(activityId);
  res.json({ success: true });
});

module.exports = router;
