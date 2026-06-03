const request = require('supertest');
const app = require('../index');

let token;

beforeAll(async () => {
  const res = await request(app).post('/api/auth/register').send({ name: 'Leaderboard_User', pin: '0001' });
  token = res.body.token;
});

describe('GET /api/leaderboard', () => {
  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(401);
  });

  test('returns correct shape on empty database', async () => {
    const res = await request(app).get('/api/leaderboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.overall)).toBe(true);
    expect(Array.isArray(res.body.by_type.run)).toBe(true);
    expect(Array.isArray(res.body.by_type.cycle)).toBe(true);
    expect(Array.isArray(res.body.by_type.walk)).toBe(true);
    expect(typeof res.body.team.total_km).toBe('number');
    expect(typeof res.body.team.total_seconds).toBe('number');
    expect(typeof res.body.team.activity_count).toBe('number');
    expect(typeof res.body.team.this_week_km).toBe('number');
  });

  describe('with data', () => {
    let tokenH, tokenI;

    beforeAll(async () => {
      const regH = await request(app).post('/api/auth/register').send({ name: 'Henry', pin: '3333' });
      tokenH = regH.body.token;
      const regI = await request(app).post('/api/auth/register').send({ name: 'Iris', pin: '4444' });
      tokenI = regI.body.token;

      // Henry: 10km run + 20km cycle
      await request(app).post('/api/activities').set('Authorization', `Bearer ${tokenH}`)
        .send({ type: 'run', distance_km: 10, duration_seconds: 3600, activity_date: '2024-01-10' });
      await request(app).post('/api/activities').set('Authorization', `Bearer ${tokenH}`)
        .send({ type: 'cycle', distance_km: 20, duration_seconds: 3600, activity_date: '2024-01-11' });

      // Iris: 5km run
      await request(app).post('/api/activities').set('Authorization', `Bearer ${tokenI}`)
        .send({ type: 'run', distance_km: 5, duration_seconds: 1500, activity_date: '2024-01-12' });
    });

    test('overall leaderboard ranks by total distance descending', async () => {
      const res = await request(app).get('/api/leaderboard').set('Authorization', `Bearer ${token}`);
      const henry = res.body.overall.find(u => u.name === 'Henry');
      const iris = res.body.overall.find(u => u.name === 'Iris');
      expect(henry.total_km).toBe(30);
      expect(henry.activity_count).toBe(2);
      expect(iris.total_km).toBe(5);
      // Henry should rank above Iris
      const henryIdx = res.body.overall.findIndex(u => u.name === 'Henry');
      const irisIdx = res.body.overall.findIndex(u => u.name === 'Iris');
      expect(henryIdx).toBeLessThan(irisIdx);
    });

    test('per-type leaderboards are correct', async () => {
      const res = await request(app).get('/api/leaderboard').set('Authorization', `Bearer ${token}`);
      const henryRun = res.body.by_type.run.find(u => u.name === 'Henry');
      const irisRun = res.body.by_type.run.find(u => u.name === 'Iris');
      expect(henryRun.distance_km).toBe(10);
      expect(irisRun.distance_km).toBe(5);

      const henryCycle = res.body.by_type.cycle.find(u => u.name === 'Henry');
      expect(henryCycle.distance_km).toBe(20);

      // Iris has no cycle or walk entries
      const irisCycle = res.body.by_type.cycle.find(u => u.name === 'Iris');
      expect(irisCycle).toBeUndefined();
    });

    test('team totals aggregate all users', async () => {
      const res = await request(app).get('/api/leaderboard').set('Authorization', `Bearer ${token}`);
      expect(res.body.team.total_km).toBeGreaterThanOrEqual(35); // 10 + 20 + 5
      expect(res.body.team.activity_count).toBeGreaterThanOrEqual(3);
      expect(res.body.team.total_seconds).toBeGreaterThanOrEqual(8700);
    });
  });
});
