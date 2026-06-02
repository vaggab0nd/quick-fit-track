# QuickFit Track

A simple office fitness tracker for small teams. Log runs, cycles, and walks manually or sync automatically from Strava. See who's putting in the most km on a live leaderboard.

## Features

- **Name + PIN login** — no email or OAuth account needed to participate
- **Manual logging** — quickly add a run, cycle, or walk with distance and duration
- **Strava sync** — connect your Strava account; new activities import automatically via webhook
- **Leaderboard** — overall rankings plus separate tabs for run, cycle, and walk
- **Team stats** — combined distance, time, activity count, and this week's total

## Quick start

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Configure
cp .env.example server/.env
# Edit server/.env with your values (see below)

# Run (two terminals)
cd server && node index.js      # API → http://localhost:3001
cd client && npm run dev        # UI  → http://localhost:5173
```

## Environment variables (`server/.env`)

```
PORT=3001
JWT_SECRET=<random string>
STRAVA_CLIENT_ID=<from strava.com/settings/api>
STRAVA_CLIENT_SECRET=<from strava.com/settings/api>
STRAVA_VERIFY_TOKEN=<any string you choose>
APP_URL=http://localhost:5173
```

`STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` are the only values that come from Strava. Everything else you set yourself. Strava access and refresh tokens are obtained automatically when users connect their accounts in the app — you don't need to handle them manually.

## Strava setup

1. Create an API app at [strava.com/settings/api](https://www.strava.com/settings/api)
2. Set **Authorization Callback Domain** to your domain (or `localhost` for dev)
3. Copy **Client ID** and **Client Secret** into `server/.env`
4. To enable auto-sync webhooks, expose port 3001 publicly (e.g. `ngrok http 3001`) and register your webhook once:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d callback_url=https://YOUR_PUBLIC_URL/api/strava/webhook \
  -d verify_token=YOUR_STRAVA_VERIFY_TOKEN
```

Manual activity logging works without Strava configured at all.

## Tech stack

- **Backend** — Node.js, Express, SQLite (better-sqlite3), bcryptjs, JWT
- **Frontend** — React 18, Vite, Tailwind CSS, React Router

## Project structure

```
server/
  index.js          Express app entry point
  db.js             SQLite schema + connection
  middleware/       JWT auth
  routes/           auth, activities, leaderboard, strava
client/
  src/
    pages/          Login, Dashboard, MyActivities
    components/     Navbar, AddActivityModal
    api.js          Fetch wrapper
    App.jsx         Auth context + router
```

See [CLAUDE.md](./CLAUDE.md) for full developer reference.
