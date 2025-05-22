import { expect } from 'chai';
import { testDb } from '../../spec/testDb';
import { getDbConnection } from '../../db/db';
import { TagCategoryEntity } from '../../db/entities/TagCategory';
import { TagEntity } from '../../db/entities/Tag';
import { NameEntity } from '../../db/entities/Name';
import { LanguageEntity } from '../../db/entities/Language';
import { setupTestApp } from '../../spec/testApp';
import { ENV } from '../../env';

describe('GET /client-tag-categories', () => {
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  const apiKey = ENV.CLIENT_API_KEY;

  beforeEach(async () => {
    // Clear the database
    const connection = getDbConnection();
    await connection.synchronize(true);

    // Create test languages
    await testDb.saveTestLanguages([
      { name: 'English', code: 'EN' },
      { name: 'Spanish', code: 'ES' },
    ]);

    // Create test tags
    await testDb.saveTestTags([{ name: 'Democracy' }, { name: 'Freedom' }, { name: 'Rights' }]);

    // Get the saved tags
    const tags = await connection.getRepository(TagEntity).find({
      relations: ['names'],
    });

    // Add Spanish names to tags
    const tagRepo = connection.getRepository(TagEntity);
    const nameRepo = connection.getRepository(NameEntity);
    const spanishLanguage = await connection.getRepository(LanguageEntity).findOneOrFail({ where: { code: 'ES' } });

    for (const tag of tags) {
      if (!tag.names || tag.names.length === 0) {
        throw new Error(`Tag ${tag.id} has no names`);
      }

      const spanishName = nameRepo.create({
        name:
          tag.names[0].name === 'Democracy' ? 'Democracia' : tag.names[0].name === 'Freedom' ? 'Libertad' : 'Derechos',
        language: spanishLanguage,
        type: 'tag',
      });

      await nameRepo.save(spanishName);
      tag.names = [...tag.names, spanishName];
      await tagRepo.save(tag);
    }

    // Create test tag categories
    const tagCategories = await testDb.saveTestTagCategories([
      {
        names: [
          { languageCode: 'EN', name: 'Political Concepts' },
          { languageCode: 'ES', name: 'Conceptos Políticos' },
        ],
      },
      {
        names: [
          { languageCode: 'EN', name: 'Social Issues' },
          { languageCode: 'ES', name: 'Problemas Sociales' },
        ],
      },
    ]);

    // Associate tags with categories using save() instead of update()
    const tagCategoryRepo = connection.getRepository(TagCategoryEntity);

    // First category gets first two tags
    const firstCategory = await tagCategoryRepo.findOneOrFail({ where: { id: tagCategories[0].id } });
    firstCategory.tags = tags.slice(0, 2);
    await tagCategoryRepo.save(firstCategory);

    // Second category gets the last tag
    const secondCategory = await tagCategoryRepo.findOneOrFail({ where: { id: tagCategories[1].id } });
    secondCategory.tags = tags.slice(2);
    await tagCategoryRepo.save(secondCategory);

    // Create test app with a fresh connection
    testApp = await setupTestApp({
      dbConnection: getDbConnection(),
    });
  });

  afterEach(async () => {
    // Clear the database after each test
    const connection = getDbConnection();
    await connection.synchronize(true);
  });

  it('should return tag categories with tags in the specified language', async () => {
    const res = await testApp
      .request()
      .get('/client-tag-categories')
      .headers({ 'x-api-key': apiKey })
      .query({ languageCode: 'EN' })
      .end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('tagCategories');
    expect(parsedRes.tagCategories).to.be.an('array');
    expect(parsedRes.tagCategories).to.have.length(2);

    // Check first category
    const firstCategory = parsedRes.tagCategories[0];
    expect(firstCategory.name).to.equal('Political Concepts');
    expect(firstCategory.tags).to.have.length(2);
    expect(firstCategory.tags[0].name).to.equal('Democracy');
    expect(firstCategory.tags[1].name).to.equal('Freedom');

    // Check second category
    const secondCategory = parsedRes.tagCategories[1];
    expect(secondCategory.name).to.equal('Social Issues');
    expect(secondCategory.tags).to.have.length(1);
    expect(secondCategory.tags[0].name).to.equal('Rights');
  });

  it('should return tag categories in Spanish when requested', async () => {
    const res = await testApp
      .request()
      .get('/client-tag-categories')
      .headers({ 'x-api-key': apiKey })
      .query({ languageCode: 'ES' })
      .end();

    expect(res.statusCode).to.equal(200);
    const parsedRes = await res.json();

    expect(parsedRes).to.have.property('tagCategories');
    expect(parsedRes.tagCategories).to.be.an('array');
    expect(parsedRes.tagCategories).to.have.length(2);

    // Check first category
    const firstCategory = parsedRes.tagCategories[0];
    expect(firstCategory.name).to.equal('Conceptos Políticos');
    expect(firstCategory.tags).to.have.length(2);
    expect(firstCategory.tags[0].name).to.equal('Democracia');
    expect(firstCategory.tags[1].name).to.equal('Libertad');

    // Check second category
    const secondCategory = parsedRes.tagCategories[1];
    expect(secondCategory.name).to.equal('Problemas Sociales');
    expect(secondCategory.tags).to.have.length(1);
    expect(secondCategory.tags[0].name).to.equal('Derechos');
  });

  it('should return 401 when API key is missing', async () => {
    const res = await testApp.request().get('/client-tag-categories').query({ languageCode: 'EN' }).end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();
    expect(parsedRes).to.have.property('error', 'Invalid API key');
  });

  it('should return 401 when API key is invalid', async () => {
    const res = await testApp
      .request()
      .get('/client-tag-categories')
      .headers({ 'x-api-key': 'invalid-api-key' })
      .query({ languageCode: 'EN' })
      .end();

    expect(res.statusCode).to.equal(401);
    const parsedRes = await res.json();
    expect(parsedRes).to.have.property('error', 'Invalid API key');
  });

  it('should return 500 when language code is invalid', async () => {
    const res = await testApp
      .request()
      .get('/client-tag-categories')
      .headers({ 'x-api-key': apiKey })
      .query({ languageCode: 'INVALID' })
      .end();

    expect(res.statusCode).to.equal(500);
    const parsedRes = await res.json();
    expect(parsedRes).to.have.property('error');
  });
});
