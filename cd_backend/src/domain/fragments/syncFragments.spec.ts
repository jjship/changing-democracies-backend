import { expect } from 'chai';
import sinon from 'sinon';
import { getDbConnection } from '../../db/db';
import { syncFragments } from './syncFragments';
import { FragmentEntity } from '../../db/entities/Fragment';
import uuid4 from 'uuid4';
import { logger } from '../../services/logger/logger';
import { parseVideoToFragment } from './fragments.api';

describe('syncFragments', () => {
  it('should parse new videos and save them in database', async () => {
    const uid1 = uuid4();
    const uid2 = uuid4();
    const uid3 = uuid4();
    const mockVids = [
      { guid: uid1, title: 'vid_one', length: 1 },
      { guid: uid2, title: 'vid_two', length: 20 },
      { guid: uid3, title: 'vid_three', length: 300 },
    ] as any;

    const dbConnection = getDbConnection();

    const bunnyStreamApiMock = {
      getVideos: sinon.stub().resolves(mockVids),
      deleteVideoCaptions: sinon.stub().resolves(),
    };

    await syncFragments({ dbConnection, bunnyStream: bunnyStreamApiMock, logger: logger });

    const dbFragments = await dbConnection.getRepository(FragmentEntity).find();

    expect(dbFragments).to.have.length(mockVids.length);
    dbFragments.forEach((fragment, index) => {
      expect(fragment).to.deep.include({
        id: mockVids[index].guid,
        title: mockVids[index].title,
        durationSec: mockVids[index].length,
        playerUrl: `https://iframe.mediadelivery.net/embed/239326/${mockVids[index].guid}`,
        thumbnailUrl: `https://vz-cac74041-8b3.b-cdn.net/${mockVids[index].guid}/thumbnail.jpg`,
        person: undefined,
        tags: undefined,
        narrativeFragments: undefined,
      });
    });
  });

  it('should remove fragments for which videos are no longer in Bunny', async () => {
    const uid1 = uuid4();
    const uid2 = uuid4();
    const uid3 = uuid4();
    const prevVids = [
      { guid: uid1, title: 'vid_one', length: 1 },
      { guid: uid2, title: 'vid_two', length: 20 },
      { guid: uid3, title: 'vid_three', length: 300 },
    ] as any;

    const currVids = prevVids.filter((vid: any) => vid.guid !== uid1);

    const dbConnection = getDbConnection();

    const prevFragments = prevVids.map((video: any) => parseVideoToFragment(video));

    await dbConnection.getRepository(FragmentEntity).save(prevFragments);

    const prevDbFragments = await dbConnection.getRepository(FragmentEntity).find();

    const bunnyStreamApiMock = {
      getVideos: sinon.stub().resolves(currVids),
      deleteVideoCaptions: sinon.stub().resolves(),
    };

    await syncFragments({ dbConnection, bunnyStream: bunnyStreamApiMock, logger: logger });

    const currDbFragments = await dbConnection.getRepository(FragmentEntity).find();

    expect(prevDbFragments).to.have.length(prevVids.length);
    expect(currDbFragments).to.have.length(currVids.length);
    currDbFragments.forEach((fragment, index) => {
      expect(fragment).to.deep.include({
        id: currVids[index].guid,
        title: currVids[index].title,
        durationSec: currVids[index].length,
        playerUrl: `https://iframe.mediadelivery.net/embed/239326/${currVids[index].guid}`,
        thumbnailUrl: `https://vz-cac74041-8b3.b-cdn.net/${currVids[index].guid}/thumbnail.jpg`,
        person: undefined,
        tags: undefined,
        narrativeFragments: undefined,
      });
    });
  });
});
