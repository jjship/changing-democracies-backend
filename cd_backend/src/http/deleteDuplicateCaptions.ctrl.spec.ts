import { expect } from 'chai';
import sinon from 'sinon';
import { setupTestApp } from '../spec/testApp';
import { ENV } from '../env';

describe('Delete Duplicate Captions Controller', () => {
  it('should delete duplicate captions when dryRun is false', async () => {
    const mockVideos = [
      {
        guid: 'video1',
        captions: [
          { srclang: 'nl', label: 'NL' },
          { srclang: 'nl-auto', label: 'NL' },
        ],
      },
    ];

    const bunnyStreamMock = {
      getVideos: sinon.stub().resolves(mockVideos),
      deleteVideoCaptions: sinon.stub().resolves(),
    };

    const app = await setupTestApp({ bunnyStream: bunnyStreamMock });
    const response = await app
      .request()
      .post('/delete-duplicate-captions')
      .headers({ 'x-api-key': ENV.GITHUB_API_KEY })
      .body({
        dryRun: false,
      })
      .end();

    expect(response.statusCode).to.equal(200);
    expect(bunnyStreamMock.deleteVideoCaptions.calledOnce).to.be.true;
  });

  it('should not delete captions when dryRun is true', async () => {
    const mockVideos = [
      {
        guid: 'video1',
        captions: [
          { srclang: 'nl', label: 'NL' },
          { srclang: 'nl-auto', label: 'NL' },
        ],
      },
    ];

    const bunnyStreamMock = {
      getVideos: sinon.stub().resolves(mockVideos),
      deleteVideoCaptions: sinon.stub().resolves(),
    };

    const app = await setupTestApp({ bunnyStream: bunnyStreamMock });

    const response = await app
      .request()
      .post('/delete-duplicate-captions')
      .headers({ 'x-api-key': ENV.GITHUB_API_KEY })
      .body({
        dryRun: true,
      })
      .end();

    expect(response.statusCode).to.equal(200);
    expect(bunnyStreamMock.deleteVideoCaptions.called).to.be.false;
  });

  it('should not delete captions when no duplicates exist', async () => {
    const mockVideos = [
      {
        guid: 'video1',
        captions: [
          { srclang: 'nl', label: 'NL' },
          { srclang: 'en', label: 'EN' },
        ],
      },
    ];

    const bunnyStreamMock = {
      getVideos: sinon.stub().resolves(mockVideos),
      deleteVideoCaptions: sinon.stub().resolves(),
    };

    const app = await setupTestApp({ bunnyStream: bunnyStreamMock });

    const response = await app
      .request()
      .post('/delete-duplicate-captions')
      .headers({ 'x-api-key': ENV.GITHUB_API_KEY })
      .body({
        dryRun: false,
      })
      .end();

    expect(response.statusCode).to.equal(200);
    expect(bunnyStreamMock.deleteVideoCaptions.called).to.be.false;
  });
});
