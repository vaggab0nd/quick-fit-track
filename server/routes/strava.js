const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_URL = 'https://www.strava.com/api/v3';

const TYPE_MAP = {
  Run: 'run',
  Ride: 'cycle',
  Walk: 'walk',
  Hike: 'walk',
};

async function refreshStravaToken(user) {
  const response = await axios.post(STRAVA_TOKEN_URL, {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: user.strava_refresh_token,
  });

  const { access_token, refresh_token, expires_at } = response.data;

  db.prepare(`
    UPDATE users SET strava_access_token = ?, strava_refresh_token = ?, strava_token_expires_at = ?
    WHERE id = ?
  `).run(access_token, refresh_token, expires_at, user.id);

  return access_token;
}

async function getValidAccessToken(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || !user.strava_access_token) {
    throw new Error('No Strava connection');
  }

  const now = Math.floor(Date.now() / 1000);
  if (!user.strava_token_expires_at || user.strava_token_expires_at < now + 60) {
    return await refreshStravaToken(user);
  }

  return user.strava_access_token;
}

function importActivities(userId, stravaActivities) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO activities
      (user_id, type, distance_km, duration_seconds, elevation_m, activity_date, source, strava_activity_id)
    VALUES (?, ?, ?, ?, ?, ?, 'strava', ?)
  `);

  let imported = 0;
  for (const act of stravaActivities) {
    const mappedType = TYPE_MAP[act.type];
    if (!mappedType) continue;

    const distanceKm = act.distance / 1000;
    const durationSeconds = act.moving_time;
    const elevationM = act.total_elevation_gain || 0;
    const activityDate = act.start_date_local
      ? act.start_date_local.slice(0, 10)
      : act.start_date.slice(0, 10);

    const result = insert.run(
      userId,
      mappedType,
      distanceKm,
      durationSeconds,
      elevationM,
      activityDate,
      String(act.id)
    );

    if (result.changes > 0) imported++;
  }

  return imported;
}

// GET /api/strava/auth
router.get('/auth', authMiddleware, (req, res) => {
  const redirectUri = `${process.env.APP_URL}/api/strava/callback`;
  // Sign state with JWT so it can't be guessed or forged (prevents CSRF account-linking)
  const state = jwt.sign({ userId: req.userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state,
  });

  res.redirect(`${STRAVA_AUTH_URL}?${params.toString()}`);
});

// GET /api/strava/callback
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.APP_URL}/my-activities?strava_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect(`${process.env.APP_URL}/my-activities?strava_error=missing_params`);
  }

  let userId;
  try {
    const payload = jwt.verify(state, process.env.JWT_SECRET);
    userId = payload.userId;
  } catch {
    return res.redirect(`${process.env.APP_URL}/my-activities?strava_error=invalid_state`);
  }

  try {
    const redirectUri = `${process.env.APP_URL}/api/strava/callback`;
    const tokenResponse = await axios.post(STRAVA_TOKEN_URL, {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;

    db.prepare(`
      UPDATE users
      SET strava_athlete_id = ?, strava_access_token = ?, strava_refresh_token = ?, strava_token_expires_at = ?
      WHERE id = ?
    `).run(athlete.id, access_token, refresh_token, expires_at, userId);

    // Fetch and import recent activities
    const activitiesResponse = await axios.get(`${STRAVA_API_URL}/athlete/activities`, {
      headers: { Authorization: `Bearer ${access_token}` },
      params: { per_page: 100, page: 1 },
    });

    importActivities(userId, activitiesResponse.data);

    res.redirect(`${process.env.APP_URL}/my-activities?strava_connected=1`);
  } catch (err) {
    console.error('Strava callback error:', err.response?.data || err.message);
    res.redirect(`${process.env.APP_URL}/my-activities?strava_error=auth_failed`);
  }
});

// GET /api/strava/webhook - Strava webhook verification
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
    res.json({ 'hub.challenge': challenge });
  } else {
    res.status(403).json({ error: 'Verification failed' });
  }
});

// POST /api/strava/webhook - receive new activity events
router.post('/webhook', async (req, res) => {
  // Acknowledge immediately
  res.status(200).send('EVENT_RECEIVED');

  const event = req.body;
  if (event.object_type !== 'activity' || event.aspect_type !== 'create') return;

  const stravaActivityId = String(event.object_id);
  const stravaAthleteId = event.owner_id;

  try {
    const user = db.prepare('SELECT * FROM users WHERE strava_athlete_id = ?').get(stravaAthleteId);
    if (!user) return;

    const accessToken = await getValidAccessToken(user.id);
    const actResponse = await axios.get(`${STRAVA_API_URL}/activities/${stravaActivityId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    importActivities(user.id, [actResponse.data]);
  } catch (err) {
    console.error('Webhook import error:', err.message);
  }
});

// POST /api/strava/sync
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req.userId);

    const activitiesResponse = await axios.get(`${STRAVA_API_URL}/athlete/activities`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 100, page: 1 },
    });

    const imported = importActivities(req.userId, activitiesResponse.data);
    res.json({ imported, total: activitiesResponse.data.length });
  } catch (err) {
    console.error('Sync error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to sync Strava activities' });
  }
});

// DELETE /api/strava/disconnect
router.delete('/disconnect', authMiddleware, (req, res) => {
  db.prepare(`
    UPDATE users
    SET strava_athlete_id = NULL, strava_access_token = NULL, strava_refresh_token = NULL, strava_token_expires_at = NULL
    WHERE id = ?
  `).run(req.userId);

  res.json({ success: true });
});

module.exports = router;
