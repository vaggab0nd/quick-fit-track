const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/leaderboard
router.get('/', (req, res) => {
  // Overall leaderboard
  const overall = db.prepare(`
    SELECT u.name,
           ROUND(SUM(a.distance_km), 2) AS total_km,
           SUM(a.duration_seconds) AS total_seconds,
           COUNT(*) AS activity_count
    FROM users u
    JOIN activities a ON a.user_id = u.id
    GROUP BY u.id, u.name
    ORDER BY total_km DESC
  `).all();

  // Per-type leaderboards
  const byType = {};
  for (const type of ['run', 'cycle', 'walk']) {
    byType[type] = db.prepare(`
      SELECT u.name,
             ROUND(SUM(a.distance_km), 2) AS distance_km,
             SUM(a.duration_seconds) AS duration_seconds,
             COUNT(*) AS count
      FROM users u
      JOIN activities a ON a.user_id = u.id
      WHERE a.type = ?
      GROUP BY u.id, u.name
      ORDER BY distance_km DESC
    `).all(type);
  }

  // Team stats
  const teamRow = db.prepare(`
    SELECT ROUND(SUM(distance_km), 2) AS total_km,
           SUM(duration_seconds) AS total_seconds,
           COUNT(*) AS activity_count
    FROM activities
  `).get();

  // This week stats
  const weekRow = db.prepare(`
    SELECT ROUND(SUM(distance_km), 2) AS this_week_km
    FROM activities
    WHERE activity_date >= date('now', 'weekday 0', '-7 days')
  `).get();

  const team = {
    total_km: teamRow?.total_km || 0,
    total_seconds: teamRow?.total_seconds || 0,
    activity_count: teamRow?.activity_count || 0,
    this_week_km: weekRow?.this_week_km || 0,
  };

  res.json({ overall, by_type: byType, team });
});

module.exports = router;
