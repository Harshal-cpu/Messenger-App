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

async function registerUser(overrides = {}) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Test User',
      email: `user${Date.now()}${Math.random()}@example.com`,
      password: 'secret123',
      ...overrides,
    });
  return { token: res.body.accessToken, user: res.body.data.user };
}

describe('Friend request flow', () => {
  it('sends, lists, and accepts a friend request, resulting in mutual friendship', async () => {
    const alice = await registerUser({ name: 'Alice', email: 'alice@example.com' });
    const bob = await registerUser({ name: 'Bob', email: 'bob@example.com' });

    const sendRes = await request(app)
      .post(`/api/v1/friends/request/${bob.user._id}`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(sendRes.status).toBe(201);

    const receivedRes = await request(app)
      .get('/api/v1/friends/requests')
      .set('Authorization', `Bearer ${bob.token}`);
    expect(receivedRes.body.results).toBe(1);

    const requestId = receivedRes.body.data.requests[0]._id;
    const acceptRes = await request(app)
      .patch(`/api/v1/friends/accept/${requestId}`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(acceptRes.status).toBe(200);

    const aliceFriends = await request(app)
      .get('/api/v1/users/me/friends')
      .set('Authorization', `Bearer ${alice.token}`);
    expect(aliceFriends.body.results).toBe(1);
    expect(aliceFriends.body.data.friends[0]._id).toBe(bob.user._id);
  });

  it('prevents sending a friend request to yourself', async () => {
    const alice = await registerUser({ name: 'Alice', email: 'alice2@example.com' });

    const res = await request(app)
      .post(`/api/v1/friends/request/${alice.user._id}`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(res.status).toBe(400);
  });
});

describe('1:1 chat creation', () => {
  it('creates a chat between two users and prevents duplicates', async () => {
    const alice = await registerUser({ name: 'Alice', email: 'alice3@example.com' });
    const bob = await registerUser({ name: 'Bob', email: 'bob3@example.com' });

    const first = await request(app)
      .post(`/api/v1/chats/one-to-one/${bob.user._id}`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/v1/chats/one-to-one/${bob.user._id}`)
      .set('Authorization', `Bearer ${alice.token}`);

    expect(second.body.data.chat._id).toBe(first.body.data.chat._id);
  });

  it('sends and retrieves a text message in a chat', async () => {
    const alice = await registerUser({ name: 'Alice', email: 'alice4@example.com' });
    const bob = await registerUser({ name: 'Bob', email: 'bob4@example.com' });

    const chatRes = await request(app)
      .post(`/api/v1/chats/one-to-one/${bob.user._id}`)
      .set('Authorization', `Bearer ${alice.token}`);
    const chatId = chatRes.body.data.chat._id;

    const sendRes = await request(app)
      .post(`/api/v1/messages/${chatId}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ content: 'Hello Bob!' });
    expect(sendRes.status).toBe(201);

    const historyRes = await request(app)
      .get(`/api/v1/messages/${chatId}`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(historyRes.body.results).toBe(1);
    expect(historyRes.body.data.messages[0].content).toBe('Hello Bob!');
  });
});
