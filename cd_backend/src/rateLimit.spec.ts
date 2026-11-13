import { expect } from 'chai';
import { setupTestApp } from './spec/testApp';
import { ENV } from './env';

const remaining = (headers: Record<string, unknown>) => Number(headers['x-ratelimit-remaining']);
const limit = (headers: Record<string, unknown>) => Number(headers['x-ratelimit-limit']);

describe('Rate limiting', () => {
  it('should budget CMS requests per session user, not per address', async () => {
    const testApp = await setupTestApp();
    const tokenA = await testApp.createAuthToken({ email: 'a@example.com' });
    const tokenB = await testApp.createAuthToken({ email: 'b@example.com' });

    const first = await testApp
      .request()
      .get('/auth/session')
      .headers({ authorization: `Bearer ${tokenA}` })
      .end();
    const second = await testApp
      .request()
      .get('/auth/session')
      .headers({ authorization: `Bearer ${tokenA}` })
      .end();
    const other = await testApp
      .request()
      .get('/auth/session')
      .headers({ authorization: `Bearer ${tokenB}` })
      .end();

    expect(first.statusCode).to.equal(200);
    expect(limit(first.headers)).to.equal(300);
    expect(remaining(first.headers)).to.equal(299);
    expect(remaining(second.headers)).to.equal(298);
    expect(remaining(other.headers)).to.equal(299);
  });

  it('should budget API clients separately from anonymous traffic on the same address', async () => {
    const testApp = await setupTestApp();

    const anonymous = await testApp.request().get('/health').end();
    const client = await testApp.request().get('/languages').headers({ 'x-api-key': ENV.CLIENT_API_KEY }).end();

    expect(limit(anonymous.headers)).to.equal(100);
    expect(remaining(anonymous.headers)).to.equal(99);
    expect(client.statusCode).to.equal(200);
    expect(limit(client.headers)).to.equal(300);
    expect(remaining(client.headers)).to.equal(299);
  });

  it('should not exempt requests carrying a trusted Origin header', async function () {
    this.timeout(20000);
    const testApp = await setupTestApp();

    let last = await testApp.request().get('/health').headers({ origin: ENV.CMS_URL }).end();
    for (let i = 0; i < 100; i++) {
      last = await testApp.request().get('/health').headers({ origin: ENV.CMS_URL }).end();
    }

    expect(last.statusCode).to.equal(429);
  });

  it('should count unknown routes against the anonymous budget', async function () {
    this.timeout(20000);
    const testApp = await setupTestApp();

    let last = await testApp.request().get('/does-not-exist').end();
    for (let i = 0; i < 100; i++) {
      last = await testApp.request().get('/does-not-exist').end();
    }

    expect(last.statusCode).to.equal(429);
    const fresh = await testApp.raw().inject({ method: 'GET', url: '/health', remoteAddress: '10.0.0.9' });
    expect(fresh.statusCode).to.equal(200);
  });
});
