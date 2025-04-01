import { expect } from 'chai';
import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { DataSource } from 'typeorm';
import { getDbConnection } from '../../db/db';
import uuid4 from 'uuid4';
import { ENV } from '../../env';
import { PersonEntity } from '../../db/entities/Person';
import { TagEntity } from '../../db/entities/Tag';
import { NameEntity } from '../../db/entities/Name';
import { FragmentEntity } from '../../db/entities/Fragment';
import { LanguageEntity } from '../../db/entities/Language';
import { CountryEntity } from '../../db/entities/Country';

describe.only('GET /client-fragments', async () => {
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
      { code: 'EN', name: 'English' },
      { code: 'ES', name: 'Spanish' },
    ]);
  });

  it('should return client fragments with valid API key', async () => {
    const fragmentId = uuid4();

    // Create test country
    await testDb.saveTestCountries([{ code: 'US', name: 'United States' }]);

    // Create test person with bios in multiple languages
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

    // Create test tag
    await testDb.saveTestTags([{ name: 'Democracy' }]);

    // Get the created tag to add Spanish name
    const testTag = await dbConnection
      .getRepository(TagEntity)
      .findOneOrFail({ where: {}, relations: ['names', 'names.language'] });

    // Add Spanish name to tag via testDb.saveTestNames
    const nameRepo = dbConnection.getRepository(NameEntity);
    const spanishName = nameRepo.create({
      name: 'Democracia',
      type: 'Tag',
    });

    // Get Spanish language
    const spanish = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'ES' });

    spanishName.language = spanish;
    spanishName.tag = testTag;
    await nameRepo.save(spanishName);

    // Create test fragment
    await testDb.saveTestFragments([
      {
        guid: fragmentId,
        title: 'Test Fragment',
        length: 120,
        personId: testPerson.id,
      },
    ]);

    // Associate tag with fragment
    const fragmentRepo = dbConnection.getRepository(FragmentEntity);
    const fragment = await fragmentRepo.findOneOrFail({ where: { id: fragmentId } });
    fragment.tags = [testTag];
    await fragmentRepo.save(fragment);

    // Request fragments with English language code
    const res = await testApp.request().get('/client-fragments?languageCode=EN').headers({ 'x-api-key': apiKey }).end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    // Check overall structure
    expect(parsedRes).to.have.property('data');
    expect(parsedRes).to.have.property('pagination');
    expect(parsedRes.data).to.be.an('array');
    expect(parsedRes.data).to.have.lengthOf(1);

    const fragmentResult = parsedRes.data[0];

    // Check fragment fields
    expect(fragmentResult.id).to.equal(fragmentId);
    expect(fragmentResult.title).to.equal('Test Fragment');
    expect(fragmentResult.duration).to.equal(120);
    expect(fragmentResult.playerUrl).to.include(fragmentId);
    expect(fragmentResult.thumbnailUrl).to.include(fragmentId);

    // Check person and filtered bio (only English)
    expect(fragmentResult.person.name).to.equal('Test Person');
    expect(fragmentResult.person.bio).to.equal('English bio');

    // Check country with English name
    expect(fragmentResult.person.country.code).to.equal('US');
    expect(fragmentResult.person.country.name).to.equal('United States');

    // Check tag with English name
    expect(fragmentResult.tags).to.have.lengthOf(1);
    expect(fragmentResult.tags[0].id).to.equal(testTag.id);
    expect(fragmentResult.tags[0].name).to.equal('Democracy');

    // Check pagination data
    expect(parsedRes.pagination.total).to.equal(1);
    expect(parsedRes.pagination.page).to.equal(1);
    expect(parsedRes.pagination.limit).to.equal(500);
    expect(parsedRes.pagination.pages).to.equal(1);
  });

  it('should filter by language code correctly', async () => {
    const fragmentId = uuid4();

    // Create test country
    await testDb.saveTestCountries([{ code: 'DE', name: 'Germany' }]);

    // Get country to add Spanish name
    const countryRepo = dbConnection.getRepository(CountryEntity);
    const country = await countryRepo.findOneByOrFail({ code: 'DE' });

    // Add Spanish name to country
    const nameRepo = dbConnection.getRepository(NameEntity);
    const spanishName = nameRepo.create({
      name: 'Alemania',
      type: 'Country',
    });

    // Get Spanish language
    const spanish = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'ES' });

    spanishName.language = spanish;
    spanishName.country = country;
    await nameRepo.save(spanishName);

    // Create test person with bios in multiple languages
    await testDb.saveTestPerson({
      name: 'Test Person',
      normalizedName: 'test-person',
      countryCode: 'DE',
      bios: [
        { languageCode: 'EN', bio: 'English bio' },
        { languageCode: 'ES', bio: 'Spanish bio' },
      ],
    });

    const testPerson = await dbConnection
      .getRepository(PersonEntity)
      .findOneOrFail({ where: { name: 'Test Person' }, relations: ['bios', 'bios.language'] });

    // Create test tag
    await testDb.saveTestTags([{ name: 'Democracy' }]);

    // Get the created tag to add Spanish name
    const testTag = await dbConnection
      .getRepository(TagEntity)
      .findOneOrFail({ where: {}, relations: ['names', 'names.language'] });

    // Add Spanish name to tag
    const tagSpanishName = nameRepo.create({
      name: 'Democracia',
      type: 'Tag',
    });

    tagSpanishName.language = spanish;
    tagSpanishName.tag = testTag;
    await nameRepo.save(tagSpanishName);

    // Create test fragment
    await testDb.saveTestFragments([
      {
        guid: fragmentId,
        title: 'Test Fragment',
        length: 120,
        personId: testPerson.id,
      },
    ]);

    // Associate tag with fragment
    const fragmentRepo = dbConnection.getRepository(FragmentEntity);
    const fragment = await fragmentRepo.findOneOrFail({ where: { id: fragmentId } });
    fragment.tags = [testTag];
    await fragmentRepo.save(fragment);

    // Request fragments with Spanish language code
    const res = await testApp.request().get('/client-fragments?languageCode=ES').headers({ 'x-api-key': apiKey }).end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();
    const fragmentResult = parsedRes.data[0];

    // Check Spanish content is returned
    expect(fragmentResult.person.bio).to.equal('Spanish bio');
    expect(fragmentResult.person.country.name).to.equal('Alemania');
    expect(fragmentResult.tags[0].name).to.equal('Democracia');
  });

  it('should paginate results correctly', async () => {
    // Create 25 test fragments
    const fragmentIds = Array.from({ length: 25 }, () => uuid4());

    const fragmentsToCreate = fragmentIds.map((guid, idx) => ({
      guid,
      title: `Fragment ${idx + 1}`,
      length: 100 + idx,
    }));

    await testDb.saveTestFragments(fragmentsToCreate);

    // Request first page with 10 items per page
    const res1 = await testApp
      .request()
      .get('/client-fragments?page=1&limit=10')
      .headers({ 'x-api-key': apiKey })
      .end();

    expect(res1.statusCode).to.equal(200);
    const parsedRes1 = await res1.json();

    // Check pagination metadata
    expect(parsedRes1.pagination.total).to.equal(25);
    expect(parsedRes1.pagination.page).to.equal(1);
    expect(parsedRes1.pagination.limit).to.equal(10);
    expect(parsedRes1.pagination.pages).to.equal(3);

    // Check first page has correct number of items
    expect(parsedRes1.data).to.have.lengthOf(10);

    // Request second page
    const res2 = await testApp
      .request()
      .get('/client-fragments?page=2&limit=10')
      .headers({ 'x-api-key': apiKey })
      .end();

    expect(res2.statusCode).to.equal(200);
    const parsedRes2 = await res2.json();

    // Check second page has correct number of items
    expect(parsedRes2.data).to.have.lengthOf(10);

    // Request third page (should have 5 items)
    const res3 = await testApp
      .request()
      .get('/client-fragments?page=3&limit=10')
      .headers({ 'x-api-key': apiKey })
      .end();

    expect(res3.statusCode).to.equal(200);
    const parsedRes3 = await res3.json();

    // Check third page has correct number of items
    expect(parsedRes3.data).to.have.lengthOf(5);

    // Ensure no duplicate fragments across pages
    const allFragmentIds = [
      ...parsedRes1.data.map((f: any) => f.id),
      ...parsedRes2.data.map((f: any) => f.id),
      ...parsedRes3.data.map((f: any) => f.id),
    ];

    const uniqueIds = new Set(allFragmentIds);
    expect(uniqueIds.size).to.equal(25);
  });

  it('should return an empty array when there are no fragments', async () => {
    const res = await testApp.request().get('/client-fragments').headers({ 'x-api-key': apiKey }).end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes.data).to.be.an('array');
    expect(parsedRes.data).to.have.lengthOf(0);
    expect(parsedRes.pagination.total).to.equal(0);
    expect(parsedRes.pagination.pages).to.equal(0);
  });

  it('should return unauthorized for invalid API key', async () => {
    const res = await testApp.request().get('/client-fragments').headers({ 'x-api-key': 'invalid-key' }).end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('error', 'Invalid API key');
  });

  it('should return unauthorized when no API key is provided', async () => {
    const res = await testApp.request().get('/client-fragments').end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('error', 'Invalid API key');
  });
});
