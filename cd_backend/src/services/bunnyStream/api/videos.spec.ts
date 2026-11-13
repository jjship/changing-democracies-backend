import { expect } from 'chai';
import sinon from 'sinon';
import { logger } from '../../logger/logger';
import { HttpClient } from '../../http/fetchClient';
import { createVideosApi } from './videos';

describe('VideosApi Integration Tests', () => {
  let http: HttpClient & { delete: sinon.SinonStub; get: sinon.SinonStub };

  beforeEach(() => {
    http = {
      delete: sinon.stub().resolves(),
      get: sinon.stub().resolves({ items: [], totalItems: 0 }),
      post: sinon.stub().resolves(),
    };
  });

  describe('deleteVideoCaptions', () => {
    it('should successfully delete video captions', async () => {
      const videosApi = createVideosApi({
        http,
        logger,
      })({ collectionId: 'test-collection' });

      await videosApi.deleteVideoCaptions({
        videoId: 'test-video',
        srclang: 'nl-auto',
      });

      expect(http.delete.calledOnce).to.be.true;
      expect(http.delete.firstCall.args[0]).to.equal('/videos/test-video/captions/nl-auto');
    });

    it('should handle errors when deleting captions', async () => {
      const error = new Error('API Error');
      http.delete.rejects(error);

      const videosApi = createVideosApi({
        http,
        logger,
      })({ collectionId: 'test-collection' });

      try {
        await videosApi.deleteVideoCaptions({
          videoId: 'test-video',
          srclang: 'nl-auto',
        });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect((err as Error).message).to.equal(`Failed to delete captions for video test-video: API Error`);
      }
    });
  });
});
