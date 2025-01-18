import uuid4 from 'uuid4';
import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';

describe('GET /fragments', () => {
  it('should return all fragments from db', async () => {
    const testApp = await setupTestApp();
    const authToken = testApp.createAuthToken();

    const guid1 = uuid4();
    const guid2 = uuid4();
    const guid3 = uuid4();
    const testVideos = [
      { guid: guid1, title: 'First Title', length: 1 },
      { guid: guid2, title: 'Second Title', length: 2 },
      { guid: guid3, title: 'Third Title', length: 3 },
    ];

    await testDb.saveTestFragments(testVideos);

    const res = await testApp
      .request()
      .get('/fragments')
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    const parsedRes = res.json();

    expect(
      parsedRes.data.map((item: any) => {
        delete item.attributes.createdAt;
        delete item.attributes.updatedAt;
        return item;
      })
    ).to.deep.equal([
      {
        type: 'fragment',
        id: guid1,
        attributes: {
          title: 'First Title',
          durationSec: 1,
          playerUrl: `https://iframe.mediadelivery.net/embed/239326/${guid1}`,
          thumbnailUrl: `https://vz-cac74041-8b3.b-cdn.net/${guid1}/thumbnail.jpg`,
          person: null,
          tags: [],
          country: null,
          narratives_ids: [],
        },
      },
      {
        type: 'fragment',
        id: guid2,
        attributes: {
          title: 'Second Title',
          durationSec: 2,
          playerUrl: `https://iframe.mediadelivery.net/embed/239326/${guid2}`,
          thumbnailUrl: `https://vz-cac74041-8b3.b-cdn.net/${guid2}/thumbnail.jpg`,
          person: null,
          tags: [],
          country: null,
          narratives_ids: [],
        },
      },
      {
        type: 'fragment',
        id: guid3,
        attributes: {
          title: 'Third Title',
          durationSec: 3,
          playerUrl: `https://iframe.mediadelivery.net/embed/239326/${guid3}`,
          thumbnailUrl: `https://vz-cac74041-8b3.b-cdn.net/${guid3}/thumbnail.jpg`,
          person: null,
          tags: [],
          country: null,
          narratives_ids: [],
        },
      },
    ]);
  });
});
