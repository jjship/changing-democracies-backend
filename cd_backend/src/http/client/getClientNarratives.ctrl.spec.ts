import { expect } from 'chai';
import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { DataSource } from 'typeorm';
import { getDbConnection } from '../../db/db';
import uuid4 from 'uuid4';
import { ENV } from '../../env';
import { PersonEntity } from '../../db/entities/Person';

// Describe the test suite for the getClientNarratives endpoint

describe('GET /client-narratives', async () => {
  let dbConnection: DataSource;
  let apiKey: string;

  beforeEach(async () => {
    dbConnection = getDbConnection();
    apiKey = ENV.CLIENT_API_KEY;

    await testDb.saveTestLanguages([
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
    ]);
  });

  it('should return client narratives with valid API key', async () => {
    const testApp = await setupTestApp();
    const authToken = testApp.createAuthToken();

    const guid1 = uuid4();
    const guid2 = uuid4();

    await testDb.saveTestCountries([{ code: 'US', name: 'United States' }]);

    await testDb.saveTestPerson({
      name: 'Test Person',
      normalizedName: 'test-person',
      countryCode: 'US',
      bios: [
        { languageCode: 'EN', bio: 'English bio' },
        { languageCode: 'ES', bio: 'Spanish bio' },
      ],
    });

    const testPerson = await dbConnection
      .getRepository(PersonEntity)
      .findOneOrFail({ where: { name: 'Test Person' }, relations: ['bios', 'bios.language'] });

    const testFragments = [
      { guid: guid1, title: 'First Fragment', length: 120, personId: testPerson.id },
      { guid: guid2, title: 'Second Fragment', length: 150, personId: testPerson.id },
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
            names: [
              { languageCode: 'en', name: 'Narrative English' },
              { languageCode: 'es', name: 'Narrative Spanish' },
            ],
            descriptions: [
              {
                languageCode: 'en',
                description: ['English Description 1'],
              },
              {
                languageCode: 'es',
                description: ['Spanish Description 1'],
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

    const res = await testApp.request().get('/client-narratives').headers({ 'x-api-key': apiKey }).end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.be.an('array');
    expect(parsedRes).to.have.lengthOf(1);

    const [narrativeRes] = parsedRes;

    // Check titles in both languages
    expect(narrativeRes.titles).to.deep.include({ languageCode: 'EN', title: 'Narrative English' });
    expect(narrativeRes.titles).to.deep.include({ languageCode: 'ES', title: 'Narrative Spanish' });

    // Check descriptions in both languages
    expect(narrativeRes.descriptions).to.deep.include({
      languageCode: 'EN',
      description: ['English Description 1'],
    });
    expect(narrativeRes.descriptions).to.deep.include({
      languageCode: 'ES',
      description: ['Spanish Description 1'],
    });

    expect(narrativeRes.total_length).to.equal(270);

    // Create fragments without bios for deep equality check
    const expectedFragmentsWithoutBios = [
      {
        guid: guid1,
        title: 'First Fragment',
        length: 120,
        sequence: 1,
        person: 'Test Person',
        country: {
          code: 'US',
          names: [{ languageCode: 'EN', name: 'United States' }],
        },
        otherPaths: [],
        playerUrl: `https://iframe.mediadelivery.net/embed/239326/${guid1}`,
        thumbnailUrl: `https://vz-cac74041-8b3.b-cdn.net/${guid1}/thumbnail.jpg`,
      },
      {
        guid: guid2,
        title: 'Second Fragment',
        length: 150,
        sequence: 2,
        person: 'Test Person',
        country: {
          code: 'US',
          names: [{ languageCode: 'EN', name: 'United States' }],
        },
        otherPaths: [],
        playerUrl: `https://iframe.mediadelivery.net/embed/239326/${guid2}`,
        thumbnailUrl: `https://vz-cac74041-8b3.b-cdn.net/${guid2}/thumbnail.jpg`,
      },
    ];

    const fragmentsWithoutBios = narrativeRes.fragments.map(
      ({ bios, ...rest }: { bios: { languageCode: string; bio: string }[]; [key: string]: any }) => rest
    );

    // Check the fragment properties match expected values
    fragmentsWithoutBios.forEach((fragment: any, index: number) => {
      expect(fragment.guid).to.equal(expectedFragmentsWithoutBios[index].guid);
      expect(fragment.title).to.equal(expectedFragmentsWithoutBios[index].title);
      expect(fragment.length).to.equal(expectedFragmentsWithoutBios[index].length);
      expect(fragment.sequence).to.equal(expectedFragmentsWithoutBios[index].sequence);
      expect(fragment.person).to.equal(expectedFragmentsWithoutBios[index].person);
      expect(fragment.playerUrl).to.equal(expectedFragmentsWithoutBios[index].playerUrl);
      expect(fragment.thumbnailUrl).to.equal(expectedFragmentsWithoutBios[index].thumbnailUrl);
      expect(fragment.otherPaths).to.deep.equal(expectedFragmentsWithoutBios[index].otherPaths);
      expect(fragment.country.code).to.equal('US');
      expect(fragment.country.names).to.deep.include({ languageCode: 'EN', name: 'United States' });
    });

    // Assert bios include both languages
    narrativeRes.fragments.forEach((fragment: { bios: { languageCode: string; bio: string }[] }) => {
      expect(fragment.bios).to.deep.include({ languageCode: 'EN', bio: 'English bio' });
      expect(fragment.bios).to.deep.include({ languageCode: 'ES', bio: 'Spanish bio' });
    });
  });

  it('should return an empty array when there are no narratives', async () => {
    const testApp = await setupTestApp();
    const res = await testApp.request().get('/client-narratives').headers({ 'x-api-key': apiKey }).end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.be.an('array');
    expect(parsedRes).to.have.lengthOf(0);
  });

  it('should return unauthorized for invalid API key', async () => {
    const testApp = await setupTestApp();
    const res = await testApp.request().get('/client-narratives').headers({ 'x-api-key': 'invalid-key' }).end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('error', 'Invalid API key');
  });

  it('should return unauthorized when no API key is provided', async () => {
    const testApp = await setupTestApp();
    const res = await testApp.request().get('/client-narratives').end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('error', 'Invalid API key');
  });

  it('should correctly populate otherPaths for shared fragments', async () => {
    const testApp = await setupTestApp();
    const authToken = testApp.createAuthToken();

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

    const res = await testApp.request().get('/client-narratives').headers({ 'x-api-key': apiKey }).end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.be.an('array');
    expect(parsedRes).to.have.lengthOf(2);

    // Find narratives by title (now an array of language versions)
    const narrative1Res = parsedRes.find((n: any) => n.titles.some((t: any) => t.title === 'Narrative 1'));
    const narrative2Res = parsedRes.find((n: any) => n.titles.some((t: any) => t.title === 'Narrative 2'));

    expect(narrative1Res).to.not.be.undefined;
    expect(narrative2Res).to.not.be.undefined;

    // Check otherPaths for shared fragments
    const sharedFragment1 = narrative1Res.fragments.find((f: any) => f.guid === guid1);
    const sharedFragment2 = narrative1Res.fragments.find((f: any) => f.guid === guid2);

    expect(sharedFragment1.otherPaths).to.deep.equal([]);

    // Check that the other path has the correct narrative ID
    expect(sharedFragment2.otherPaths).to.have.lengthOf(1);
    expect(sharedFragment2.otherPaths[0].id).to.equal(narrative2Res.id);
    // Verify the titles array contains "Narrative 2"
    expect(sharedFragment2.otherPaths[0].titles.some((t: any) => t.title === 'Narrative 2')).to.be.true;

    const uniqueFragment = narrative2Res.fragments.find((f: any) => f.guid === guid3);
    expect(uniqueFragment.otherPaths).to.deep.equal([]);
  });

  it('should return all language versions of narratives', async () => {
    const testApp = await setupTestApp();
    const authToken = testApp.createAuthToken();

    // Create a country - we'll check bios in multiple languages instead
    await testDb.saveTestCountries([
      {
        code: 'US',
        name: 'United States',
      },
    ]);

    // Create person with bio in multiple languages
    await testDb.saveTestPerson({
      name: 'Multilingual Person',
      normalizedName: 'multilingual-person',
      countryCode: 'US',
      bios: [
        { languageCode: 'EN', bio: 'English bio text' },
        { languageCode: 'ES', bio: 'Texto de biografía en español' },
      ],
    });

    const guid = uuid4();
    const testPerson = await dbConnection
      .getRepository(PersonEntity)
      .findOneOrFail({ where: { name: 'Multilingual Person' }, relations: ['bios', 'bios.language'] });

    await testDb.saveTestFragments([{ guid, title: 'Test Fragment', length: 120, personId: testPerson.id }]);

    // Create narrative with multilingual content
    await testApp
      .request()
      .post('/narratives')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'narrative',
          attributes: {
            names: [
              { languageCode: 'en', name: 'Narrative in English' },
              { languageCode: 'es', name: 'Narrativa en Español' },
            ],
            descriptions: [
              {
                languageCode: 'en',
                description: ['English description line 1', 'English description line 2'],
              },
              {
                languageCode: 'es',
                description: ['Descripción en español línea 1', 'Descripción en español línea 2'],
              },
            ],
            fragmentsSequence: [
              {
                fragmentId: guid,
                sequence: 1,
              },
            ],
          },
        },
      })
      .end();

    const res = await testApp.request().get('/client-narratives').headers({ 'x-api-key': apiKey }).end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.be.an('array');
    expect(parsedRes).to.have.lengthOf(1);

    const narrative = parsedRes[0];

    // Check that titles include both language versions
    expect(narrative.titles).to.have.lengthOf(2);
    expect(narrative.titles).to.deep.include({ languageCode: 'EN', title: 'Narrative in English' });
    expect(narrative.titles).to.deep.include({ languageCode: 'ES', title: 'Narrativa en Español' });

    // Check that descriptions include both language versions
    expect(narrative.descriptions).to.have.lengthOf(2);
    expect(narrative.descriptions).to.deep.include({
      languageCode: 'EN',
      description: ['English description line 1', 'English description line 2'],
    });
    expect(narrative.descriptions).to.deep.include({
      languageCode: 'ES',
      description: ['Descripción en español línea 1', 'Descripción en español línea 2'],
    });

    // Check fragment's multilingual data
    const fragment = narrative.fragments[0];

    // Check bios in both languages
    expect(fragment.bios).to.have.lengthOf(2);
    expect(fragment.bios).to.deep.include({ languageCode: 'EN', bio: 'English bio text' });
    expect(fragment.bios).to.deep.include({ languageCode: 'ES', bio: 'Texto de biografía en español' });

    // Check country code
    expect(fragment.country.code).to.equal('US');
  });
});
