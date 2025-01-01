import uuid4 from 'uuid4';
import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';

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

    console.log({ res });
  });
});
