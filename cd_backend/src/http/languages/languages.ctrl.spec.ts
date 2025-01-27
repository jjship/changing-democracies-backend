import { expect } from 'chai';
import { DataSource } from 'typeorm';
import { setupTestApp } from '../../spec/testApp';
import { getDbConnection } from '../../db/db';
import { LanguageEntity } from '../../db/entities/Language';
import { testDb } from '../../spec/testDb';

describe('Languages Controller', () => {
  let dbConnection: DataSource;
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  let authToken: string;

  beforeEach(async () => {
    testApp = await setupTestApp();
    dbConnection = getDbConnection();
    authToken = testApp.createAuthToken();
  });

  describe('POST /languages', () => {
    it('should create a new language when authenticated', async () => {
      const response = await testApp
        .request()
        .post('/languages')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          name: 'English',
          code: 'EN',
        })
        .end();

      expect(response.statusCode).to.equal(201);
      const body = response.json();
      expect(body).to.have.property('id').that.is.a('string');
      expect(body).to.have.property('name', 'English');
      expect(body).to.have.property('code', 'EN');

      // Verify database state
      const language = await dbConnection.getRepository(LanguageEntity).findOne({
        where: { id: body.id },
      });
      expect(language).to.not.be.null;
      expect(language!.name).to.equal('English');
      expect(language!.code).to.equal('EN');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp
        .request()
        .post('/languages')
        .body({
          name: 'English',
          code: 'EN',
        })
        .end();

      expect(response.statusCode).to.equal(401);
    });

    it('should fail when language code is not unique', async () => {
      await testDb.saveTestLanguages([{ name: 'English', code: 'EN' }]);

      const response = await testApp
        .request()
        .post('/languages')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          name: 'English Duplicate',
          code: 'EN',
        })
        .end();

      expect(response.statusCode).to.equal(500);
    });
  });

  describe('PUT /languages/:id', () => {
    let existingLanguageId: string;

    beforeEach(async () => {
      // Create a language to update
      const language = new LanguageEntity();
      language.name = 'Original Language';
      language.code = 'OL';
      const savedLanguage = await dbConnection.getRepository(LanguageEntity).save(language);
      existingLanguageId = savedLanguage.id;
    });

    it('should update an existing language when authenticated', async () => {
      const response = await testApp
        .request()
        .put(`/languages/${existingLanguageId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          name: 'Updated Language',
          code: 'UL',
        })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body.id).to.equal(existingLanguageId);
      expect(body.name).to.equal('Updated Language');
      expect(body.code).to.equal('UL');

      // Verify database state
      const language = await dbConnection.getRepository(LanguageEntity).findOne({
        where: { id: existingLanguageId },
      });
      expect(language!.name).to.equal('Updated Language');
      expect(language!.code).to.equal('UL');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp
        .request()
        .put(`/languages/${existingLanguageId}`)
        .body({
          name: 'Test',
          code: 'TS',
        })
        .end();

      expect(response.statusCode).to.equal(401);
    });

    it('should return 404 for non-existent language', async () => {
      const response = await testApp
        .request()
        .put('/languages/non-existent-id')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          name: 'Test',
          code: 'TS',
        })
        .end();

      expect(response.statusCode).to.equal(404);
    });
  });

  describe('DELETE /languages/:id', () => {
    let existingLanguageId: string;

    beforeEach(async () => {
      // Create a language to delete
      const language = new LanguageEntity();
      language.name = 'Language to Delete';
      language.code = 'LD';
      const savedLanguage = await dbConnection.getRepository(LanguageEntity).save(language);
      existingLanguageId = savedLanguage.id;
    });

    it('should delete an existing language when authenticated', async () => {
      const response = await testApp
        .request()
        .delete(`/languages/${existingLanguageId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);

      const language = await dbConnection.getRepository(LanguageEntity).findOne({
        where: { id: existingLanguageId },
      });
      expect(language).to.be.null;
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp.request().delete(`/languages/${existingLanguageId}`).end();

      expect(response.statusCode).to.equal(401);
    });

    it('should succeed even if language does not exist', async () => {
      const response = await testApp
        .request()
        .delete('/languages/non-existent-id')
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);
    });
  });

  describe('GET /languages', () => {
    beforeEach(async () => {
      // Create some languages to fetch
      const languages = [
        { name: 'Language A', code: 'LA' },
        { name: 'Language B', code: 'LB' },
      ];

      await testDb.saveTestLanguages(languages);
    });

    it('should fetch all languages when authenticated', async () => {
      const response = await testApp
        .request()
        .get('/languages')
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body).to.be.an('array').that.has.length(2);
      expect(body[0]).to.have.property('id').that.is.a('string');
      expect(body[0]).to.have.property('name').that.is.a('string');
      expect(body[0]).to.have.property('code').that.is.a('string');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp.request().get('/languages').end();

      expect(response.statusCode).to.equal(401);
    });
  });
});
