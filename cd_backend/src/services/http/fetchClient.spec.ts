import { expect } from 'chai';
import sinon from 'sinon';
import { logger } from '../logger/logger';
import { createFetchClient, HttpRequestError } from './fetchClient';

describe('fetchClient', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  const client = () =>
    createFetchClient({
      baseUrl: 'https://api.example.org/library/42',
      headers: { AccessKey: 'secret' },
      retry: { retries: 2, retryDelayMs: () => 0 },
      logger,
    });

  it('should keep the base path, add query params and default headers', async () => {
    fetchStub.resolves(new Response('{"items":[]}', { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await client().get<{ items: unknown[] }>('/videos', { query: { page: 2, skip: undefined } });

    expect(result).to.deep.equal({ items: [] });
    const [url, init] = fetchStub.firstCall.args;
    expect(String(url)).to.equal('https://api.example.org/library/42/videos?page=2');
    expect(init.method).to.equal('GET');
    expect(init.headers.AccessKey).to.equal('secret');
  });

  it('should send JSON bodies', async () => {
    fetchStub.resolves(new Response(null, { status: 204 }));

    const result = await client().post('/videos/1', { title: 'x' });

    expect(result).to.equal(undefined);
    const [, init] = fetchStub.firstCall.args;
    expect(init.headers['content-type']).to.equal('application/json');
    expect(init.body).to.equal('{"title":"x"}');
  });

  it('should retry idempotent requests on 5xx', async () => {
    fetchStub.onFirstCall().resolves(new Response('busy', { status: 503 }));
    fetchStub
      .onSecondCall()
      .resolves(new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await client().get('/videos');

    expect(result).to.deep.equal({ ok: true });
    expect(fetchStub.callCount).to.equal(2);
  });

  it('should not retry non-idempotent requests on 5xx', async () => {
    fetchStub.resolves(new Response('boom', { status: 500 }));

    try {
      await client().post('/videos/1', {});
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpRequestError);
      expect((err as HttpRequestError).status).to.equal(500);
    }
    expect(fetchStub.callCount).to.equal(1);
  });

  it('should retry any method on network errors and give up after the configured retries', async () => {
    fetchStub.rejects(new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }));

    try {
      await client().post('/videos/1', {});
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as HttpRequestError).code).to.equal('ECONNRESET');
      expect((err as HttpRequestError).status).to.equal(undefined);
    }
    expect(fetchStub.callCount).to.equal(3);
  });

  it('should map timeouts to ECONNABORTED without retrying', async () => {
    fetchStub.rejects(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));

    try {
      await client().get('/videos');
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as HttpRequestError).code).to.equal('ECONNABORTED');
    }
    expect(fetchStub.callCount).to.equal(1);
  });

  it('should not retry client errors and keep secrets out of the error url', async () => {
    fetchStub.resolves(new Response('nope', { status: 404 }));

    try {
      await client().get('/videos', { query: { access_key: 'hidden' } });
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as HttpRequestError).status).to.equal(404);
      expect((err as HttpRequestError).url).to.equal('https://api.example.org/library/42/videos');
      expect((err as Error).message).to.not.include('hidden');
    }
    expect(fetchStub.callCount).to.equal(1);
  });
});
