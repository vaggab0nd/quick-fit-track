require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const activitiesRoutes = require('./routes/activities');
const stravaRoutes = require('./routes/strava');
const leaderboardRoutes = require('./routes/leaderboard');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - allow frontend dev origin
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/strava', stravaRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Serve client build in production
const clientBuild = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuild));

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuild, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
