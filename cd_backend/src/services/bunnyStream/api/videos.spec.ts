import { expect } from 'chai';
import sinon from 'sinon';
import axios from 'axios';
import { createVideosApi } from './videos';
import { logger } from '../../logger/logger';

describe('VideosApi Integration Tests', () => {
  let axiosInstance: any;

  beforeEach(() => {
    axiosInstance = {
      delete: sinon.stub().resolves(),
      get: sinon.stub().resolves({
        data: {
          items: [],
          totalItems: 0,
        },
      }),
    };
  });

  describe('deleteVideoCaptions', () => {
    it('should successfully delete video captions', async () => {
      const videosApi = createVideosApi({
        axios: axiosInstance,
        logger,
      })({ collectionId: 'test-collection' });

      await videosApi.deleteVideoCaptions({
        videoId: 'test-video',
        srclang: 'nl-auto',
      });

      expect(axiosInstance.delete.calledOnce).to.be.true;
      expect(axiosInstance.delete.firstCall.args[0]).to.equal('/videos/test-video/captions/nl-auto');
    });

    it('should handle errors when deleting captions', async () => {
      const error = new Error('API Error');
      axiosInstance.delete.rejects(error);

      const videosApi = createVideosApi({
        axios: axiosInstance,
        logger,
      })({ collectionId: 'test-collection' });

      try {
        await videosApi.deleteVideoCaptions({
          videoId: 'test-video',
          srclang: 'nl-auto',
        });
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });
});
