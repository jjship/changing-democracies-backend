import { expect } from 'chai';
import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { DataSource } from 'typeorm';
import { getDbConnection } from '../../db/db';
import uuid4 from 'uuid4';
import { ENV } from '../../env';

// Describe the test suite for the getClientNarratives endpoint

describe('POST /client-narratives', async () => {
  let dbConnection: DataSource;
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  let apiKey: string;
  let authToken: string;

  beforeEach(async () => {
    testApp = await setupTestApp();
    dbConnection = getDbConnection();
    authToken = testApp.createAuthToken();
    apiKey = ENV.CLIENT_API_KEY;

    await testDb.saveTestLanguages([
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
    ]);
  });

  it('should return client narratives with valid API key', async () => {
    const guid1 = uuid4();
    const guid2 = uuid4();

    const testFragments = [
      { guid: guid1, title: 'First Fragment', durationSec: 120, length: 120 },
      { guid: guid2, title: 'Second Fragment', durationSec: 150, length: 150 },
    ];

    await testDb.saveTestFragments(testFragments);

    await testApp
      .request()
      .post('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'en', name: 'Narrative 1' }],
            descriptions: [
              {
                languageCode: 'en',
                description: ['Description 1'],
              },
            ],
            fragmentsSequence: [
              {
                fragmentId: guid1,
                sequence: 1,
              },
              {
                fragmentId: guid2,
                sequence: 2,
              },
            ],
          },
        },
      })
      .end();

    const res = await testApp
      .request()
      .post('/client-narratives')
      .headers({ 'x-api-key': apiKey })
      .body({ languageCode: 'en' })
      .end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.be.an('array');
    expect(parsedRes).to.have.lengthOf(1);

    const [narrativeRes] = parsedRes;

    expect(narrativeRes.title).to.equal('Narrative 1');
    expect(narrativeRes.description).to.deep.equal(['Description 1']);
    expect(narrativeRes.total_length).to.equal(270);
    expect(narrativeRes.fragments).to.deep.equal([
      {
        guid: guid1,
        title: 'First Fragment',
        length: 120,
        sequence: 1,
        otherPaths: [],
      },
      {
        guid: guid2,
        title: 'Second Fragment',
        length: 150,
        sequence: 2,
        otherPaths: [],
      },
    ]);
  });

  it('should return an empty array when there are no narratives', async () => {
    const res = await testApp
      .request()
      .post('/client-narratives')
      .headers({ 'x-api-key': apiKey })
      .body({ languageCode: 'en' })
      .end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.be.an('array');
    expect(parsedRes).to.have.lengthOf(0);
  });

  it('should return unauthorized for invalid API key', async () => {
    const res = await testApp
      .request()
      .post('/client-narratives')
      .headers({ 'x-api-key': 'invalid-key' })
      .body({ languageCode: 'en' })
      .end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('error', 'Invalid API key');
  });

  it('should return unauthorized when no API key is provided', async () => {
    const res = await testApp.request().post('/client-narratives').body({ languageCode: 'en' }).end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('error', 'Invalid API key');
  });

  it('should correctly populate otherPaths for shared fragments', async () => {
    const guid1 = uuid4();
    const guid2 = uuid4();
    const guid3 = uuid4();

    const testFragments = [
      { guid: guid1, title: 'Shared Fragment 1', durationSec: 100, length: 100 },
      { guid: guid2, title: 'Shared Fragment 2', durationSec: 200, length: 200 },
      { guid: guid3, title: 'Unique Fragment', durationSec: 150, length: 150 },
    ];

    await testDb.saveTestFragments(testFragments);

    // Create first narrative
    await testApp
      .request()
      .post('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'en', name: 'Narrative 1' }],
            descriptions: [
              {
                languageCode: 'en',
                description: ['Description 1'],
              },
            ],
            fragmentsSequence: [
              {
                fragmentId: guid1,
                sequence: 1,
              },
              {
                fragmentId: guid2,
                sequence: 2,
              },
            ],
          },
        },
      })
      .end();

    // Create second narrative
    await testApp
      .request()
      .post('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'en', name: 'Narrative 2' }],
            descriptions: [
              {
                languageCode: 'en',
                description: ['Description 2'],
              },
            ],
            fragmentsSequence: [
              {
                fragmentId: guid2,
                sequence: 1,
              },
              {
                fragmentId: guid3,
                sequence: 2,
              },
            ],
          },
        },
      })
      .end();

    const res = await testApp
      .request()
      .post('/client-narratives')
      .headers({ 'x-api-key': apiKey })
      .body({ languageCode: 'en' })
      .end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.be.an('array');
    expect(parsedRes).to.have.lengthOf(2);

    const [narrative1Res, narrative2Res] = parsedRes;

    // Check otherPaths for shared fragments
    const sharedFragment1 = narrative1Res.fragments.find((f: any) => f.guid === guid1);
    const sharedFragment2 = narrative1Res.fragments.find((f: any) => f.guid === guid2);

    expect(sharedFragment1.otherPaths).to.deep.equal([]);
    expect(sharedFragment2.otherPaths).to.deep.equal([{ id: narrative2Res.id, title: 'Narrative 2' }]);

    const uniqueFragment = narrative2Res.fragments.find((f: any) => f.guid === guid3);
    expect(uniqueFragment.otherPaths).to.deep.equal([]);
  });
});
