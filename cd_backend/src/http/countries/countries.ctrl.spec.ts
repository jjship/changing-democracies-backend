import { expect } from 'chai';
import { DataSource } from 'typeorm';
import { setupTestApp } from '../../spec/testApp';
import { getDbConnection } from '../../db/db';
import { LanguageEntity } from '../../db/entities/Language';
import { CountryEntity } from '../../db/entities/Country';
import { NameEntity } from '../../db/entities/Name';
import { testDb } from '../../spec/testDb';

describe('Countries Controller', () => {
  let dbConnection: DataSource;
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  let authToken: string;

  beforeEach(async () => {
    testApp = await setupTestApp();
    dbConnection = getDbConnection();
    authToken = testApp.createAuthToken();

    await testDb.saveTestLanguages([
      { code: 'EN', name: 'English' },
      { code: 'ES', name: 'Spanish' },
    ]);
  });

  describe('POST /countries', () => {
    it('should create a new country with names in multiple languages', async () => {
      const response = await testApp
        .request()
        .post('/countries')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [
            { languageCode: 'EN', name: 'United States' },
            { languageCode: 'ES', name: 'Estados Unidos' },
          ],
          code: 'US',
        })
        .end();

      expect(response.statusCode).to.equal(201);
      const body = response.json();
      expect(body).to.have.property('id').that.is.a('string');
      expect(body.names).to.have.lengthOf(2);
      expect(body.names).to.deep.include({ languageCode: 'EN', name: 'United States' });
      expect(body.names).to.deep.include({ languageCode: 'ES', name: 'Estados Unidos' });
      expect(body).to.have.property('code', 'US');

      // Verify database state
      const country = await dbConnection.getRepository(CountryEntity).findOne({
        where: { id: body.id },
        relations: ['names', 'names.language'],
      });
      expect(country).to.not.be.null;
      expect(country!.names).to.have.lengthOf(2);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp
        .request()
        .post('/countries')
        .body({
          names: [{ languageCode: 'EN', name: 'Test Country' }],
        })
        .end();

      expect(response.statusCode).to.equal(401);
    });

    it('should fail when language does not exist', async () => {
      const response = await testApp
        .request()
        .post('/countries')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [{ languageCode: 'xx', name: 'Invalid Language' }],
        })
        .end();

      expect(response.statusCode).to.equal(500);
    });
  });

  describe('PUT /countries/:id', () => {
    let existingCountryId: string;

    beforeEach(async () => {
      // Create a country to update
      const country = new CountryEntity();
      country.code = 'UP';
      const name = new NameEntity();
      name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name.name = 'Original Name';
      name.type = 'Country';
      name.country = country;
      country.names = [name];

      const savedCountry = await dbConnection.getRepository(CountryEntity).save(country);
      existingCountryId = savedCountry.id;
    });

    it('should update an existing country', async () => {
      const response = await testApp
        .request()
        .put(`/countries/${existingCountryId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [
            { languageCode: 'EN', name: 'Updated Name' },
            { languageCode: 'ES', name: 'Nombre Actualizado' },
          ],
          code: 'UP',
        })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body.id).to.equal(existingCountryId);
      expect(body.names).to.have.lengthOf(2);
      expect(body.names).to.deep.include({ languageCode: 'EN', name: 'Updated Name' });
      expect(body.names).to.deep.include({ languageCode: 'ES', name: 'Nombre Actualizado' });
      expect(body).to.have.property('code', 'UP');

      // Verify database state
      const country = await dbConnection.getRepository(CountryEntity).findOne({
        where: { id: existingCountryId },
        relations: ['names', 'names.language'],
      });
      expect(country!.names).to.have.lengthOf(2);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp
        .request()
        .put(`/countries/${existingCountryId}`)
        .body({
          names: [{ languageCode: 'EN', name: 'Test' }],
        })
        .end();

      expect(response.statusCode).to.equal(401);
    });

    it('should return 404 for non-existent country', async () => {
      const response = await testApp
        .request()
        .put('/countries/non-existent-id')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          names: [{ languageCode: 'EN', name: 'Test' }],
          code: 'XX',
        })
        .end();

      expect(response.statusCode).to.equal(404);
    });
  });

  describe('DELETE /countries/:id', () => {
    let existingCountryId: string;

    beforeEach(async () => {
      // Create a country to delete
      const country = new CountryEntity();
      country.code = 'CD';
      const name = new NameEntity();
      name.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name.name = 'Country to Delete';
      name.type = 'Country';
      name.country = country;
      country.names = [name];

      const savedCountry = await dbConnection.getRepository(CountryEntity).save(country);
      existingCountryId = savedCountry.id;
    });

    it('should delete an existing country', async () => {
      const response = await testApp
        .request()
        .delete(`/countries/${existingCountryId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);

      const country = await dbConnection.getRepository(CountryEntity).findOne({
        where: { id: existingCountryId },
      });
      expect(country).to.be.null;

      const names = await dbConnection.getRepository(NameEntity).find({
        where: { country: { id: existingCountryId } },
      });
      expect(names).to.be.empty;
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp.request().delete(`/countries/${existingCountryId}`).end();

      expect(response.statusCode).to.equal(401);
    });

    it('should succeed even if country does not exist', async () => {
      const response = await testApp
        .request()
        .delete('/countries/non-existent-id')
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);
    });
  });

  describe('GET /countries', () => {
    beforeEach(async () => {
      // Create some countries to fetch
      const country1 = new CountryEntity();
      country1.code = 'CA';
      const name1 = new NameEntity();
      name1.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name1.name = 'Country A';
      name1.type = 'Country';
      name1.country = country1;
      country1.names = [name1];
      await dbConnection.getRepository(CountryEntity).save(country1);

      const country2 = new CountryEntity();
      country2.code = 'CB';
      const name2 = new NameEntity();
      name2.language = await dbConnection.getRepository(LanguageEntity).findOneByOrFail({ code: 'EN' });
      name2.name = 'Country B';
      name2.type = 'Country';
      name2.country = country2;
      country2.names = [name2];
      await dbConnection.getRepository(CountryEntity).save(country2);
    });

    it('should fetch all countries', async () => {
      const response = await testApp
        .request()
        .get('/countries')
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body).to.be.an('array').that.has.length(2);
      expect(body[0]).to.have.property('id').that.is.a('string');
      expect(body[0]).to.have.property('names').that.is.an('array');
      expect(body[0].names[0]).to.have.property('languageCode').that.is.a('string');
      expect(body[0].names[0]).to.have.property('name').that.is.a('string');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp.request().get('/countries').end();

      expect(response.statusCode).to.equal(401);
    });
  });
});
