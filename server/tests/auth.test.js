const request = require('supertest');
const app = require('../index');

describe('POST /api/auth/register', () => {
  test('creates user and returns token + safe user object', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', pin: '1234' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('Alice');
    expect(res.body.user.pin_hash).toBeUndefined();
  });

  test('rejects duplicate name', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Bob', pin: '1234' });
    const res = await request(app).post('/api/auth/register').send({ name: 'Bob', pin: '5678' });
    expect(res.status).toBe(409);
  });

  test('rejects missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({ pin: '1234' });
    expect(res.status).toBe(400);
  });

  test('rejects name longer than 50 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A'.repeat(51), pin: '1234' });
    expect(res.status).toBe(400);
  });

  test('rejects PIN shorter than 4 digits', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Carol', pin: '12' });
    expect(res.status).toBe(400);
  });

  test('rejects PIN with letters', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Carol', pin: 'abcd' });
    expect(res.status).toBe(400);
  });

  test('rejects PIN longer than 4 digits', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Carol', pin: '12345' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ name: 'Dave', pin: '9999' });
  });

  test('returns token and strips sensitive fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ name: 'Dave', pin: '9999' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.pin_hash).toBeUndefined();
    expect(res.body.user.strava_access_token).toBeUndefined();
    expect(res.body.user.strava_refresh_token).toBeUndefined();
  });

  test('rejects wrong PIN', async () => {
    const res = await request(app).post('/api/auth/login').send({ name: 'Dave', pin: '0000' });
    expect(res.status).toBe(401);
  });

  test('rejects unknown user', async () => {
    const res = await request(app).post('/api/auth/login').send({ name: 'Nobody', pin: '1234' });
    expect(res.status).toBe(401);
  });

  test('returns same error for wrong PIN vs unknown user (no enumeration)', async () => {
    const wrongPin = await request(app).post('/api/auth/login').send({ name: 'Dave', pin: '0000' });
    const unknown = await request(app).post('/api/auth/login').send({ name: 'Nobody', pin: '1234' });
    expect(wrongPin.body.error).toBe(unknown.body.error);
  });
});

describe('GET /api/auth/me', () => {
  let token;
  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Eve', pin: '5555' });
    token = res.body.token;
  });

  test('returns current user', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Eve');
    expect(res.body.user.pin_hash).toBeUndefined();
  });

  test('rejects request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects a malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer bad.token.value');
    expect(res.status).toBe(401);
  });

  test('rejects a token signed with wrong secret', async () => {
    const jwt = require('jsonwebtoken');
    const fakeToken = jwt.sign({ userId: 1 }, 'wrong-secret');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${fakeToken}`);
    expect(res.status).toBe(401);
  });
});
