const request = require('supertest');
const app = require('../app');
const dbHandler = require('./dbHandler');

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

const testUser = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'secret123',
};

describe('POST /api/v1/auth/register', () => {
  it('creates a new user and returns an access token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects duplicate emails', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.status).toBe(409);
  });

  it('rejects a weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, password: '123' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('rejects incorrect password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the authenticated user with a valid token', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(testUser);
    const { accessToken } = registerRes.body;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
