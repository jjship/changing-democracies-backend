import { expect } from 'chai';
import sinon from 'sinon';
import { setupTestApp } from '../../spec/testApp';
import { BunnyStreamApiClient } from '../../services/bunnyStream/bunnyStreamApiClient';

const makeBunnyStream = () =>
  ({
    getVideos: sinon.stub().resolves([]),
    updateVideo: sinon.stub().resolves({ guid: 'vid-1', title: 'Updated' }),
    uploadCaptions: sinon.stub().resolves(),
    deleteVideoCaptions: sinon.stub().resolves(),
  }) as unknown as BunnyStreamApiClient & {
    getVideos: sinon.SinonStub;
    updateVideo: sinon.SinonStub;
    uploadCaptions: sinon.SinonStub;
  };

describe('Videos CMS endpoints', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('GET /videos', () => {
    it('should return 401 without a JWT', async () => {
      const testApp = await setupTestApp({ bunnyStream: makeBunnyStream() });

      const res = await testApp.request().get('/videos').end();

      expect(res.statusCode).to.equal(401);
    });

    it('should return the video list with a valid JWT', async () => {
      const bunnyStream = makeBunnyStream();
      (bunnyStream.getVideos as sinon.SinonStub).resolves([{ guid: 'vid-1', title: 'A' }]);
      const testApp = await setupTestApp({ bunnyStream });
      const token = testApp.createAuthToken();

      const res = await testApp
        .request()
        .get('/videos')
        .headers({ Authorization: `Bearer ${token}` })
        .end();

      expect(res.statusCode).to.equal(200);
      expect(res.json()).to.deep.equal([{ guid: 'vid-1', title: 'A' }]);
    });
  });

  describe('PATCH /videos/:id', () => {
    it('should return 401 without a JWT', async () => {
      const testApp = await setupTestApp({ bunnyStream: makeBunnyStream() });

      const res = await testApp.request().patch('/videos/vid-1').body({ title: 'X' }).end();

      expect(res.statusCode).to.equal(401);
    });

    it('should map tags to an upper-cased metaTag and call updateVideo', async () => {
      const bunnyStream = makeBunnyStream();
      const testApp = await setupTestApp({ bunnyStream });
      const token = testApp.createAuthToken();

      const res = await testApp
        .request()
        .patch('/videos/vid-1')
        .headers({ Authorization: `Bearer ${token}`, 'content-type': 'application/json' })
        .body(JSON.stringify({ title: 'New title', tags: 'foo bar' }))
        .end();

      expect(res.statusCode).to.equal(200);
      const updateStub = bunnyStream.updateVideo as sinon.SinonStub;
      expect(updateStub.calledOnce).to.be.true;
      expect(updateStub.firstCall.args[0]).to.deep.equal({
        videoId: 'vid-1',
        title: 'New title',
        metaTags: [{ property: 'tags', value: 'FOO BAR' }],
      });
    });

    it('should not touch metaTags when tags are omitted (avoids wiping Bunny tags)', async () => {
      const bunnyStream = makeBunnyStream();
      const testApp = await setupTestApp({ bunnyStream });
      const token = testApp.createAuthToken();

      const res = await testApp
        .request()
        .patch('/videos/vid-1')
        .headers({ Authorization: `Bearer ${token}`, 'content-type': 'application/json' })
        .body(JSON.stringify({ title: 'Only title' }))
        .end();

      expect(res.statusCode).to.equal(200);
      const updateStub = bunnyStream.updateVideo as sinon.SinonStub;
      expect(updateStub.calledOnce).to.be.true;
      expect(updateStub.firstCall.args[0].title).to.equal('Only title');
      expect(updateStub.firstCall.args[0].metaTags).to.be.undefined;
    });
  });

  describe('PUT /videos/:id/captions/:srclang', () => {
    it('should return 401 without a JWT', async () => {
      const testApp = await setupTestApp({ bunnyStream: makeBunnyStream() });

      const res = await testApp
        .request()
        .put('/videos/vid-1/captions/en')
        .body({ label: 'English', vtt: 'WEBVTT' })
        .end();

      expect(res.statusCode).to.equal(401);
    });

    it('should base64-encode the VTT, upload, and purge the CDN', async () => {
      fetchStub.resolves(new Response('ok', { status: 200 }));
      const bunnyStream = makeBunnyStream();
      const testApp = await setupTestApp({ bunnyStream });
      const token = testApp.createAuthToken();

      const res = await testApp
        .request()
        .put('/videos/vid-1/captions/en-US')
        .headers({ Authorization: `Bearer ${token}`, 'content-type': 'application/json' })
        .body(JSON.stringify({ label: 'English', vtt: 'WEBVTT\n\nhello' }))
        .end();

      expect(res.statusCode).to.equal(200);
      expect(res.json()).to.deep.equal({ ok: true });

      const uploadStub = bunnyStream.uploadCaptions as sinon.SinonStub;
      expect(uploadStub.calledOnce).to.be.true;
      expect(uploadStub.firstCall.args[0]).to.deep.equal({
        videoId: 'vid-1',
        srclang: 'en', // region suffix stripped
        label: 'English',
        captionsBase64: Buffer.from('WEBVTT\n\nhello').toString('base64'),
      });

      // Cache purge fired
      expect(fetchStub.calledOnce).to.be.true;
      const [purgeUrl] = fetchStub.firstCall.args;
      expect(purgeUrl).to.include('api.bunny.net/purge');
      expect(purgeUrl).to.include('vid-1%2Fcaptions');
    });
  });

  describe('GET /videos/:id/captions/:srclang', () => {
    it('should return the VTT text', async () => {
      fetchStub.resolves(new Response('WEBVTT\n\nhello', { status: 200 }));
      const testApp = await setupTestApp({ bunnyStream: makeBunnyStream() });
      const token = testApp.createAuthToken();

      const res = await testApp
        .request()
        .get('/videos/vid-1/captions/en')
        .headers({ Authorization: `Bearer ${token}` })
        .end();

      expect(res.statusCode).to.equal(200);
      expect(res.json()).to.deep.equal({ vtt: 'WEBVTT\n\nhello' });
    });

    it('should return 404 when the caption file does not exist', async () => {
      fetchStub.resolves(new Response('not found', { status: 404 }));
      const testApp = await setupTestApp({ bunnyStream: makeBunnyStream() });
      const token = testApp.createAuthToken();

      const res = await testApp
        .request()
        .get('/videos/vid-1/captions/fr')
        .headers({ Authorization: `Bearer ${token}` })
        .end();

      expect(res.statusCode).to.equal(404);
    });
  });
});
