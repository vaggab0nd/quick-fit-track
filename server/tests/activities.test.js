const request = require('supertest');
const app = require('../index');

let tokenA, tokenB, userAId;

beforeAll(async () => {
  const regA = await request(app).post('/api/auth/register').send({ name: 'Frank', pin: '1111' });
  tokenA = regA.body.token;
  userAId = regA.body.user.id;

  const regB = await request(app).post('/api/auth/register').send({ name: 'Grace', pin: '2222' });
  tokenB = regB.body.token;
});

describe('POST /api/activities', () => {
  test('creates a valid run activity', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'run', distance_km: 5.0, duration_seconds: 1800, activity_date: '2024-01-15' });
    expect(res.status).toBe(201);
    expect(res.body.activity.type).toBe('run');
    expect(res.body.activity.distance_km).toBe(5.0);
    expect(res.body.activity.source).toBe('manual');
  });

  test('creates a cycle and walk activity', async () => {
    const cycle = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'cycle', distance_km: 20, duration_seconds: 3600, activity_date: '2024-01-16' });
    expect(cycle.status).toBe(201);

    const walk = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'walk', distance_km: 2, duration_seconds: 1800, activity_date: '2024-01-17' });
    expect(walk.status).toBe(201);
  });

  test('rejects invalid activity type', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'swim', distance_km: 1.0, duration_seconds: 600, activity_date: '2024-01-15' });
    expect(res.status).toBe(400);
  });

  test('rejects zero distance', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'run', distance_km: 0, duration_seconds: 600, activity_date: '2024-01-15' });
    expect(res.status).toBe(400);
  });

  test('rejects negative distance', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'run', distance_km: -5, duration_seconds: 600, activity_date: '2024-01-15' });
    expect(res.status).toBe(400);
  });

  test('rejects zero duration', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'run', distance_km: 5, duration_seconds: 0, activity_date: '2024-01-15' });
    expect(res.status).toBe(400);
  });

  test('rejects invalid date format', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'run', distance_km: 5, duration_seconds: 600, activity_date: '15-01-2024' });
    expect(res.status).toBe(400);
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/activities')
      .send({ type: 'run', distance_km: 5, duration_seconds: 600, activity_date: '2024-01-15' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/activities', () => {
  test('returns only the authenticated user\'s own activities', async () => {
    const res = await request(app)
      .get('/api/activities')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.activities)).toBe(true);
    expect(res.body.activities.every(a => a.user_id !== userAId)).toBe(true);
  });

  test('returns activities newest first', async () => {
    const res = await request(app)
      .get('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const dates = res.body.activities.map(a => a.activity_date);
    const sorted = [...dates].sort((a, b) => b.localeCompare(a));
    expect(dates).toEqual(sorted);
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/activities');
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/activities/:id', () => {
  let ownActivityId;
  let otherActivityId;

  beforeAll(async () => {
    const own = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'walk', distance_km: 3, duration_seconds: 2700, activity_date: '2024-01-20' });
    ownActivityId = own.body.activity.id;

    const other = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'run', distance_km: 7, duration_seconds: 2400, activity_date: '2024-01-21' });
    otherActivityId = other.body.activity.id;
  });

  test('deletes own activity', async () => {
    const res = await request(app)
      .delete(`/api/activities/${ownActivityId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 403 when deleting another user\'s activity', async () => {
    const res = await request(app)
      .delete(`/api/activities/${otherActivityId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(403);
  });

  test('returns 404 for non-existent activity', async () => {
    const res = await request(app)
      .delete('/api/activities/99999')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  test('returns 400 for non-numeric ID', async () => {
    const res = await request(app)
      .delete('/api/activities/abc')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });
});
