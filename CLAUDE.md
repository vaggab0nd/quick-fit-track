# QuickFit Track — CLAUDE.md

## Project overview

Office fitness tracker for a small team (≤30 people). Tracks runs, cycles, and walks. Users log activities manually or connect Strava for automatic sync. A public leaderboard shows individual and team stats broken down by activity type.

## Architecture

```
quick-fit-track/
├── server/          Node/Express API + SQLite database
└── client/          React (Vite) single-page app
```

The Vite dev server proxies `/api/*` to `localhost:3001`, so the frontend always talks to a single origin. In production, Express serves the built client from `client/dist`.

## Running locally

```bash
# 1. Environment
cp .env.example server/.env
# Fill in server/.env (see Configuration section)

# 2. Install
cd server && npm install
cd ../client && npm install

# 3. Start (two terminals)
cd server && node index.js          # API on :3001
cd client && npm run dev            # UI on :5173
```

Open `http://localhost:5173`.

## Building for production

```bash
cd client && npm run build          # outputs to client/dist/
cd ../server && node index.js       # serves API + static files on PORT
```

## Configuration (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default `3001`) |
| `JWT_SECRET` | Random string for signing JWTs — keep secret |
| `STRAVA_CLIENT_ID` | From strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | From strava.com/settings/api |
| `STRAVA_VERIFY_TOKEN` | Any string you choose; used to verify the webhook endpoint with Strava |
| `APP_URL` | Full URL of the frontend (`http://localhost:5173` in dev; your domain in prod) |

## Database

SQLite file at `server/fitness.sqlite` (created automatically on first run, gitignored).

### Schema

**`users`** — name (unique), bcrypt-hashed PIN, optional Strava OAuth tokens  
**`activities`** — type (`run`/`cycle`/`walk`), distance_km, duration_seconds, elevation_m, activity_date (YYYY-MM-DD), source (`manual`/`strava`), strava_activity_id (unique, dedup key)

## API routes

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | `{name, pin}` → `{token, user}` |
| POST | `/login` | — | `{name, pin}` → `{token, user}` |
| GET | `/me` | JWT | Returns current user |

### Activities (`/api/activities`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT | User's activities, newest first |
| POST | `/` | JWT | Log manual activity |
| DELETE | `/:id` | JWT | Delete own activity |

### Leaderboard (`/api/leaderboard`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | All users' stats; overall + per type + team totals |

### Strava (`/api/strava`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/auth` | JWT | Redirects to Strava OAuth |
| GET | `/callback` | — | OAuth callback; imports activities; redirects to `/my-activities` |
| GET | `/webhook` | — | Strava webhook verification (hub.challenge) |
| POST | `/webhook` | — | Receives new activity events; auto-imports Run/Ride/Walk/Hike |
| POST | `/sync` | JWT | Re-fetches last 100 Strava activities |
| DELETE | `/disconnect` | JWT | Unlinks Strava from user account |

## Strava integration notes

- Activity type mapping: `Run→run`, `Ride→cycle`, `Walk→walk`, `Hike→walk` — all others ignored
- Tokens refresh automatically when within 60 seconds of expiry
- Dedup is handled by the `UNIQUE` constraint on `strava_activity_id` (`INSERT OR IGNORE`)
- Webhooks require a **public URL** — use `ngrok http 3001` in dev, then register once:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_ID \
  -d client_secret=YOUR_SECRET \
  -d callback_url=https://YOUR_NGROK_URL/api/strava/webhook \
  -d verify_token=YOUR_STRAVA_VERIFY_TOKEN
```

## Frontend pages

| Route | Component | Description |
|---|---|---|
| `/login` | `Login.jsx` | Sign in / register with name + 4-digit PIN |
| `/` | `Dashboard.jsx` | Team stats + tabbed leaderboard (Overall/Run/Cycle/Walk) |
| `/my-activities` | `MyActivities.jsx` | Personal log, Strava connect/sync, manual add |

Auth state lives in `AuthContext` (App.jsx). JWT is stored in `localStorage`. The `PrivateRoute` component redirects unauthenticated users to `/login`.

## Key files

```
server/db.js                    Database init and schema
server/middleware/auth.js       JWT verification
server/routes/strava.js         OAuth flow + webhook + token refresh
client/src/api.js               Fetch wrapper with auth headers
client/src/App.jsx              AuthContext + router
client/src/components/
  AddActivityModal.jsx          Manual activity form
  Navbar.jsx                    Nav + logout
```

## Common tasks

**Add a new activity type** — update the `CHECK` constraint in `db.js`, the `TYPE_MAP` in `strava.js`, and the `TYPES` array in `AddActivityModal.jsx`.

**Change token expiry** — edit the `expiresIn` value in `server/routes/auth.js` `generateToken()`.

**Wipe and reset the database** — delete `server/fitness.sqlite`; it will be recreated on next server start.
