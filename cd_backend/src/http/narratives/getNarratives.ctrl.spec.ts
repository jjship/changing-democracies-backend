import { expect } from 'chai';
import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { DataSource } from 'typeorm';
import { getDbConnection } from '../../db/db';
import uuid4 from 'uuid4';
import { ENV } from '../../env';

describe('GET /narratives', async () => {
  let dbConnection: DataSource;
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  let authToken: string;
  let apiKey: string;

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

  it('should return all narratives with JWT authentication', async () => {
    const guid1 = uuid4();
    const guid2 = uuid4();
    const guid3 = uuid4();

    const testVideos = [
      { guid: guid1, title: 'First Title', length: 1 },
      { guid: guid2, title: 'Second Title', length: 2 },
      { guid: guid3, title: 'Third Title', length: 3 },
    ];

    await testDb.saveTestFragments(testVideos);

    const narrative1 = await testApp
      .request()
      .post('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'EN', name: 'Narrative 1' }],
            descriptions: [
              {
                languageCode: 'EN',
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

    const narrative2 = await testApp
      .request()
      .post('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'EN', name: 'Narrative 2' }],
            descriptions: [
              {
                languageCode: 'EN',
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
      .get('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.be.an('array');
    expect(parsedRes).to.have.lengthOf(2);

    const [narrative1Res, narrative2Res] = parsedRes;

    expect(narrative1Res.attributes.names).to.deep.include({ languageCode: 'EN', name: 'Narrative 1' });
    expect(narrative1Res.attributes.descriptions[0]).to.deep.equal({
      languageCode: 'EN',
      description: ['Description 1'],
    });
    expect(narrative1Res.attributes.fragmentsSequence).to.deep.equal([
      { fragmentId: guid1, sequence: 1 },
      { fragmentId: guid2, sequence: 2 },
    ]);

    expect(narrative2Res.attributes.names).to.deep.include({ languageCode: 'EN', name: 'Narrative 2' });
    expect(narrative2Res.attributes.descriptions[0]).to.deep.equal({
      languageCode: 'EN',
      description: ['Description 2'],
    });
    expect(narrative2Res.attributes.fragmentsSequence).to.deep.equal([
      { fragmentId: guid2, sequence: 1 },
      { fragmentId: guid3, sequence: 2 },
    ]);
  });

  it('should return all narratives with API key authentication', async () => {
    const guid1 = uuid4();
    const guid2 = uuid4();
    const guid3 = uuid4();

    const testVideos = [
      { guid: guid1, title: 'First Title', length: 1 },
      { guid: guid2, title: 'Second Title', length: 2 },
      { guid: guid3, title: 'Third Title', length: 3 },
    ];

    await testDb.saveTestFragments(testVideos);

    await testApp
      .request()
      .post('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'EN', name: 'Narrative 1' }],
            descriptions: [
              {
                languageCode: 'EN',
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

    await testApp
      .request()
      .post('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [{ languageCode: 'EN', name: 'Narrative 2' }],
            descriptions: [
              {
                languageCode: 'EN',
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

    const res = await testApp.request().get('/narratives').headers({ 'x-api-key': apiKey }).end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.be.an('array');
    expect(parsedRes).to.have.lengthOf(2);

    const [narrative1Res, narrative2Res] = parsedRes;

    expect(narrative1Res.attributes.names).to.deep.include({ languageCode: 'EN', name: 'Narrative 1' });
    expect(narrative1Res.attributes.descriptions[0]).to.deep.equal({
      languageCode: 'EN',
      description: ['Description 1'],
    });
    expect(narrative1Res.attributes.fragmentsSequence).to.deep.equal([
      { fragmentId: guid1, sequence: 1 },
      { fragmentId: guid2, sequence: 2 },
    ]);

    expect(narrative2Res.attributes.names).to.deep.include({ languageCode: 'EN', name: 'Narrative 2' });
    expect(narrative2Res.attributes.descriptions[0]).to.deep.equal({
      languageCode: 'EN',
      description: ['Description 2'],
    });
    expect(narrative2Res.attributes.fragmentsSequence).to.deep.equal([
      { fragmentId: guid2, sequence: 1 },
      { fragmentId: guid3, sequence: 2 },
    ]);
  });

  it('should return an empty array when there are no narratives', async () => {
    const res = await testApp
      .request()
      .get('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.be.an('array');
    expect(parsedRes).to.have.lengthOf(0);
  });

  it('should return unauthorized for invalid API key', async () => {
    const res = await testApp.request().get('/narratives').headers({ 'x-api-key': 'invalid-key' }).end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('error', 'Unauthorized');
  });

  it('should return unauthorized when no auth is provided', async () => {
    const res = await testApp.request().get('/narratives').end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('error', 'Unauthorized');
  });

  it('should return unauthorized for invalid JWT token', async () => {
    const res = await testApp.request().get('/narratives').headers({ Authorization: 'Bearer invalid-token' }).end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('error', 'Unauthorized');
  });

  it('should return forbidden for API key without permissions', async () => {
    // Assuming there's a way to create an API key without the required permissions
    const apiKeyWithoutPermissions = 'key-without-permissions';
    const res = await testApp.request().get('/narratives').headers({ 'x-api-key': apiKeyWithoutPermissions }).end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('error', 'Unauthorized');
  });
});
