import uuid4 from 'uuid4';
import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';

describe('GET /fragments', () => {
  it('should return all fragments from db', async () => {
    const testApp = await setupTestApp();

    const guid1 = uuid4();
    const guid2 = uuid4();
    const guid3 = uuid4();
    const testVideos = [
      { guid: guid1, title: 'First Title', length: 1 },
      { guid: guid2, title: 'Second Title', length: 2 },
      { guid: guid3, title: 'Third Title', length: 3 },
    ];

    await testDb.saveTestFragments(testVideos);

    const res = await testApp.request().get('/fragments').end();
    const parsedRes = testApp.parseResponse(res);

    expect(
      parsedRes.data.map((item: any) => {
        delete item.createdAt;
        delete item.updatedAt;
        return item;
      })
    ).to.deep.equal([
      {
        id: guid1,
        title: 'First Title',
        duration_sec: 1,
        player_url: `https://iframe.mediadelivery.net/embed/239326/${guid1}`,
        thumbnail_url: `https://vz-cac74041-8b3.b-cdn.net/${guid1}/thumbnail.jpg`,
        person: null,
        tags: [],
        country: null,
        narratives_ids: [],
      },
      {
        id: guid2,
        title: 'Second Title',
        duration_sec: 2,
        player_url: `https://iframe.mediadelivery.net/embed/239326/${guid2}`,
        thumbnail_url: `https://vz-cac74041-8b3.b-cdn.net/${guid2}/thumbnail.jpg`,
        person: null,
        tags: [],
        country: null,
        narratives_ids: [],
      },
      {
        id: guid3,
        title: 'Third Title',
        duration_sec: 3,
        player_url: `https://iframe.mediadelivery.net/embed/239326/${guid3}`,
        thumbnail_url: `https://vz-cac74041-8b3.b-cdn.net/${guid3}/thumbnail.jpg`,
        person: null,
        tags: [],
        country: null,
        narratives_ids: [],
      },
    ]);
  });
});
