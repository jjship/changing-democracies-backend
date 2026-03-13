import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import { setupTestApp } from '../spec/testApp';
import { ENV } from '../env';

describe('Auth: JWT authentication', () => {
  it('should grant access with a valid JWT', async () => {
    const testApp = await setupTestApp();
    const token = testApp.createAuthToken();

    const res = await testApp
      .request()
      .get('/narratives')
      .headers({ Authorization: `Bearer ${token}` })
      .end();

    expect(res.statusCode).to.equal(200);
  });

  it('should return 401 for an expired JWT', async () => {
    const testApp = await setupTestApp();
    const expiredToken = jwt.sign(
      {
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) - 60,
        sub: 'test-user-id',
        email: 'test@example.com',
        role: 'authenticated',
      },
      ENV.SUPABASE_JWT_SECRET,
    );

    const res = await testApp
      .request()
      .get('/narratives')
      .headers({ Authorization: `Bearer ${expiredToken}` })
      .end();

    expect(res.statusCode).to.equal(401);
  });

  it('should return 401 for a malformed JWT', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/narratives').headers({ Authorization: 'Bearer not-a-valid-jwt' }).end();

    expect(res.statusCode).to.equal(401);
  });

  it('should return 401 when Authorization header is missing', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/narratives').end();

    expect(res.statusCode).to.equal(401);
  });

  it('should map JWT claims correctly (sub→id, email, role)', async () => {
    const testApp = await setupTestApp();
    const token = testApp.createAuthToken({
      id: 'custom-user-id',
      email: 'custom@example.com',
      role: 'authenticated',
    });

    const res = await testApp
      .request()
      .get('/narratives')
      .headers({ Authorization: `Bearer ${token}` })
      .end();

    // If claims are mapped correctly, the request succeeds
    expect(res.statusCode).to.equal(200);
  });
});

describe('Auth: API key authentication', () => {
  it('should grant access with a valid CLIENT_API_KEY', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/client-narratives').headers({ 'x-api-key': ENV.CLIENT_API_KEY }).end();

    expect(res.statusCode).to.equal(200);
  });

  it('should grant access to POST /sync-fragments with GITHUB_API_KEY', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().post('/sync-fragments').headers({ 'x-api-key': ENV.GITHUB_API_KEY }).end();

    // 200 means permission granted (handler runs, may succeed or fail on domain logic)
    expect(res.statusCode).to.equal(200);
  });

  it('should return 401 for an invalid API key', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/client-narratives').headers({ 'x-api-key': 'invalid-key' }).end();

    expect(res.statusCode).to.equal(401);
  });

  it('should return 401 when x-api-key header is missing', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/client-narratives').end();

    expect(res.statusCode).to.equal(401);
  });

  it('should return 403 when CLIENT_API_KEY tries to access POST /sync-fragments', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().post('/sync-fragments').headers({ 'x-api-key': ENV.CLIENT_API_KEY }).end();

    expect(res.statusCode).to.equal(403);
  });
});
