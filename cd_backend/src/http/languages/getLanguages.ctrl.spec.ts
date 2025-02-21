import { expect } from 'chai';
import { DataSource } from 'typeorm';
import { setupTestApp } from '../../spec/testApp';
import { getDbConnection } from '../../db/db';
import { LanguageEntity } from '../../db/entities/Language';
import { testDb } from '../../spec/testDb';
import { ENV } from '../../env';

describe('Languages Controller', () => {
  let dbConnection: DataSource;
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  let authToken: string;

  beforeEach(async () => {
    testApp = await setupTestApp();
    dbConnection = getDbConnection();
    authToken = testApp.createAuthToken();
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

    it('should fetch all languages when authenticated with API key', async () => {
      const response = await testApp.request().get('/languages').headers({ 'x-api-key': ENV.CLIENT_API_KEY }).end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body).to.be.an('array').that.has.length(2);
      expect(body[0]).to.have.property('id').that.is.a('string');
      expect(body[0]).to.have.property('name').that.is.a('string');
      expect(body[0]).to.have.property('code').that.is.a('string');
    });

    it('should fetch all languages when authenticated with JWT token', async () => {
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
