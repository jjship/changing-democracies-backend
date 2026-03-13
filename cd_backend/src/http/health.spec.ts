import { expect } from 'chai';
import { setupTestApp } from '../spec/testApp';

describe('GET /health', () => {
  it('should return { status: "ok" } with 200', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/health').end();

    expect(res.statusCode).to.equal(200);
    const body = await res.json();
    expect(body).to.deep.equal({ status: 'ok' });
  });
});

describe('Not-found handler', () => {
  it('should return 500 with { ok: false, error: "Internal Server Error" } for unknown routes', async () => {
    const testApp = await setupTestApp();

    const res = await testApp.request().get('/this-route-does-not-exist').end();

    expect(res.statusCode).to.equal(500);
    const body = await res.json();
    expect(body).to.deep.equal({ ok: false, error: 'Internal Server Error' });
  });
});
