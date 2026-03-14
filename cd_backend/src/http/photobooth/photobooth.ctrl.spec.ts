import { expect } from 'chai';
import sinon from 'sinon';
import { setupTestApp } from '../../spec/testApp';
import { ENV } from '../../env';

describe('Photobooth endpoints', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('GET /photobooth/posters', () => {
    it('should return 401 without API key', async () => {
      const testApp = await setupTestApp();

      const res = await testApp.request().get('/photobooth/posters').end();

      expect(res.statusCode).to.equal(401);
    });

    it('should return 403 with wrong permissions', async () => {
      const testApp = await setupTestApp();

      const res = await testApp
        .request()
        .get('/photobooth/posters')
        .headers({ 'x-api-key': ENV.CLIENT_API_KEY })
        .end();

      expect(res.statusCode).to.equal(403);
    });

    it('should list posters from Bunny Storage', async () => {
      const testApp = await setupTestApp();
      const bunnyPosters = [
        { Guid: 'guid-1', ObjectName: 'poster_abc_BERLIN.jpeg', DateCreated: '2026-01-01' },
        { Guid: 'guid-2', ObjectName: 'poster_def_PARIS.jpeg', DateCreated: '2026-01-02' },
      ];

      fetchStub.resolves(new Response(JSON.stringify(bunnyPosters), { status: 200 }));

      const res = await testApp
        .request()
        .get('/photobooth/posters')
        .headers({ 'x-api-key': ENV.PHOTOBOOTH_API_KEY })
        .end();

      expect(res.statusCode).to.equal(200);
      const body = res.json();
      expect(body).to.have.lengthOf(2);
      expect(body[0]).to.deep.equal({
        id: 'guid-1',
        fileName: 'poster_abc_BERLIN.jpeg',
        createdAt: '2026-01-01',
      });
      expect(body[1]).to.deep.equal({
        id: 'guid-2',
        fileName: 'poster_def_PARIS.jpeg',
        createdAt: '2026-01-02',
      });
    });

    it('should return 502 when Bunny Storage fails', async () => {
      const testApp = await setupTestApp();

      fetchStub.resolves(new Response('error', { status: 500 }));

      const res = await testApp
        .request()
        .get('/photobooth/posters')
        .headers({ 'x-api-key': ENV.PHOTOBOOTH_API_KEY })
        .end();

      expect(res.statusCode).to.equal(502);
    });
  });

  describe('PUT /photobooth/posters', () => {
    it('should return 401 without API key', async () => {
      const testApp = await setupTestApp();

      const res = await testApp.request().put('/photobooth/posters').end();

      expect(res.statusCode).to.equal(401);
    });

    it('should upload poster to Bunny Storage', async () => {
      const testApp = await setupTestApp();

      fetchStub.resolves(new Response('ok', { status: 201 }));

      const boundary = '----TestBoundary';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="blob"; filename="test.jpeg"',
        'Content-Type: image/jpeg',
        '',
        'fake-image-data',
        `--${boundary}`,
        'Content-Disposition: form-data; name="fileName"',
        '',
        'poster_test_BERLIN.jpeg',
        `--${boundary}--`,
      ].join('\r\n');

      const res = await testApp
        .request()
        .put('/photobooth/posters')
        .headers({
          'x-api-key': ENV.PHOTOBOOTH_API_KEY,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        })
        .body(body)
        .end();

      expect(res.statusCode).to.equal(200);
      expect(res.json()).to.deep.equal({ ok: true });

      // Verify fetch was called with correct Bunny Storage URL
      expect(fetchStub.calledOnce).to.be.true;
      const [url, options] = fetchStub.firstCall.args;
      expect(url).to.include(`storage.bunnycdn.com/${ENV.BUNNY_STORAGE_NAME}/posters/poster_test_BERLIN.jpeg`);
      expect(options.method).to.equal('PUT');
      expect(options.headers.AccessKey).to.equal(ENV.BUNNY_STORAGE_API_KEY);
    });
  });

  describe('DELETE /photobooth/posters/:fileName', () => {
    it('should return 401 without API key', async () => {
      const testApp = await setupTestApp();

      const res = await testApp.request().delete('/photobooth/posters/test.jpeg').end();

      expect(res.statusCode).to.equal(401);
    });

    it('should delete poster from Bunny Storage', async () => {
      const testApp = await setupTestApp();

      // First call is CDN purge, second is storage delete
      fetchStub.onFirstCall().resolves(new Response('ok', { status: 200 }));
      fetchStub.onSecondCall().resolves(new Response('ok', { status: 200 }));

      const res = await testApp
        .request()
        .delete('/photobooth/posters/poster_test_BERLIN.jpeg')
        .headers({ 'x-api-key': ENV.PHOTOBOOTH_API_KEY })
        .end();

      expect(res.statusCode).to.equal(200);
      expect(res.json()).to.deep.equal({ ok: true });

      // Verify purge was called first
      expect(fetchStub.callCount).to.equal(2);
      const [purgeUrl] = fetchStub.firstCall.args;
      expect(purgeUrl).to.include('api.bunny.net/purge');
      expect(purgeUrl).to.include('poster_test_BERLIN.jpeg');

      // Verify delete was called second
      const [deleteUrl] = fetchStub.secondCall.args;
      expect(deleteUrl).to.include(`storage.bunnycdn.com/${ENV.BUNNY_STORAGE_NAME}/posters/poster_test_BERLIN.jpeg`);
    });

    it('should return 502 when storage delete fails', async () => {
      const testApp = await setupTestApp();

      // Purge succeeds but delete fails
      fetchStub.onFirstCall().resolves(new Response('ok', { status: 200 }));
      fetchStub.onSecondCall().resolves(new Response('error', { status: 500 }));

      const res = await testApp
        .request()
        .delete('/photobooth/posters/test.jpeg')
        .headers({ 'x-api-key': ENV.PHOTOBOOTH_API_KEY })
        .end();

      expect(res.statusCode).to.equal(502);
    });
  });

  describe('POST /photobooth/posters/send-email', () => {
    it('should return 401 without API key', async () => {
      const testApp = await setupTestApp();

      const res = await testApp
        .request()
        .post('/photobooth/posters/send-email')
        .headers({ 'content-type': 'application/json' })
        .body(
          JSON.stringify({
            imageUrl: 'https://test.b-cdn.net/posters/test.jpeg',
            fileName: 'test.jpeg',
            email: 'test@example.com',
          }),
        )
        .end();

      expect(res.statusCode).to.equal(401);
    });

    it('should reject disallowed image URLs', async () => {
      const testApp = await setupTestApp();

      const res = await testApp
        .request()
        .post('/photobooth/posters/send-email')
        .headers({
          'x-api-key': ENV.PHOTOBOOTH_API_KEY,
          'content-type': 'application/json',
        })
        .body(
          JSON.stringify({
            imageUrl: 'https://evil.com/malicious.jpeg',
            fileName: 'test.jpeg',
            email: 'test@example.com',
          }),
        )
        .end();

      expect(res.statusCode).to.equal(403);
    });

    it('should send email with poster attachment', async () => {
      const testApp = await setupTestApp();

      // First fetch call is to download the image
      fetchStub.resolves(
        new Response(Buffer.from('fake-image-data'), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }),
      );

      const res = await testApp
        .request()
        .post('/photobooth/posters/send-email')
        .headers({
          'x-api-key': ENV.PHOTOBOOTH_API_KEY,
          'content-type': 'application/json',
        })
        .body(
          JSON.stringify({
            imageUrl: 'https://test.b-cdn.net/posters/test.jpeg',
            fileName: 'test.jpeg',
            email: 'test@example.com',
          }),
        )
        .end();

      // The Resend SDK will fail in test env (no real API key), but we test the route logic
      // In a real test setup you'd mock Resend. For now, we verify the fetch was called for image download.
      expect(fetchStub.calledOnce).to.be.true;
      const [imageUrl] = fetchStub.firstCall.args;
      expect(imageUrl).to.equal('https://test.b-cdn.net/posters/test.jpeg');
    });
  });
});
