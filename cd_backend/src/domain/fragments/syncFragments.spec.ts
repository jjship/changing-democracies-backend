import { expect } from 'chai';
import sinon from 'sinon';
import { createDbConnection, getDbConnection } from '../../db/db';
import { createTestDatabase } from '../../db/db.spec';
import { syncFragments } from './syncFragments';
import pino from 'pino';
import { FragmentEntity } from '../../db/entities/Fragment';
import { ENV } from '../../env';
import uuid4 from 'uuid4';
import { parseVideoToFragment } from './utils';

describe('syncFragments', () => {
  beforeEach(async () => {
    await createTestDatabase();
    await createDbConnection({
      database: ENV.TEST_DATABASE,
    });
  });

  afterEach(async () => {
    const connection = getDbConnection();
    await connection.destroy();
  });
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
    };

    await syncFragments({ dbConnection, bunnyStreamApi: bunnyStreamApiMock, logger: pino() });

    const dbFragments = await dbConnection.getRepository(FragmentEntity).find();

    expect(dbFragments).to.have.length(mockVids.length);
    dbFragments.forEach((fragment, index) => {
      expect(fragment).to.deep.include({
        id: mockVids[index].guid,
        title: mockVids[index].title,
        duration_sec: mockVids[index].length,
        player_url: `https://iframe.mediadelivery.net/embed/239326/${mockVids[index].guid}`,
        thumbnail_url: `https://vz-cac74041-8b3.b-cdn.net/${mockVids[index].guid}/thumbnail.jpg`,
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
    };

    await syncFragments({ dbConnection, bunnyStreamApi: bunnyStreamApiMock, logger: pino() });

    const currDbFragments = await dbConnection.getRepository(FragmentEntity).find();

    expect(prevDbFragments).to.have.length(prevVids.length);
    expect(currDbFragments).to.have.length(currVids.length);
    currDbFragments.forEach((fragment, index) => {
      expect(fragment).to.deep.include({
        id: currVids[index].guid,
        title: currVids[index].title,
        duration_sec: currVids[index].length,
        player_url: `https://iframe.mediadelivery.net/embed/239326/${currVids[index].guid}`,
        thumbnail_url: `https://vz-cac74041-8b3.b-cdn.net/${currVids[index].guid}/thumbnail.jpg`,
        person: undefined,
        tags: undefined,
        narrativeFragments: undefined,
      });
    });
  });
});
