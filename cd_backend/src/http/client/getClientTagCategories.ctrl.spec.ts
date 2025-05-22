import { expect } from 'chai';
import { FastifyInstance } from 'fastify';
import { registerGetClientTagCategoriesController } from './getClientTagCategories.ctrl';
import { testDb } from '../../spec/testDb';
import { getDbConnection } from '../../db/db';
import { TagCategoryEntity } from '../../db/entities/TagCategory';
import { TagEntity } from '../../db/entities/Tag';

import { getCachedClientTagCategories } from '../../domain/tagCategories/getCachedClientTagCategories';
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

    // Get all tags
    const tags = await connection.getRepository(TagEntity).find();

    // Associate tags with categories
    await connection.getRepository(TagCategoryEntity).update(
      { id: tagCategories[0].id },
      { tags: tags.slice(0, 2) } // First category gets first two tags
    );

    await connection.getRepository(TagCategoryEntity).update(
      { id: tagCategories[1].id },
      { tags: tags.slice(2) } // Second category gets the last tag
    );

    // Create test app with the controller
    testApp = await setupTestApp();
    registerGetClientTagCategoriesController(testApp.raw())({ getCachedClientTagCategories });
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

    // Check second category
    const secondCategory = parsedRes.tagCategories[1];
    expect(secondCategory.name).to.equal('Problemas Sociales');
    expect(secondCategory.tags).to.have.length(1);
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

  it('should return 400 when language code is invalid', async () => {
    const res = await testApp
      .request()
      .get('/client-tag-categories')
      .headers({ 'x-api-key': apiKey })
      .query({ languageCode: 'INVALID' })
      .end();

    expect(res.statusCode).to.equal(400);
    const parsedRes = await res.json();
    expect(parsedRes).to.have.property('error', 'Invalid query parameters');
  });
});
