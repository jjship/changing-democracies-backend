import { expect } from 'chai';
import { DataSource } from 'typeorm';
import { setupTestApp } from '../../spec/testApp';
import { getDbConnection } from '../../db/db';
import { PersonEntity } from '../../db/entities/Person';
import { CountryEntity } from '../../db/entities/Country';
import { testDb } from '../../spec/testDb';

describe('Persons Controller', () => {
  let dbConnection: DataSource;
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  let authToken: string;

  beforeEach(async () => {
    testApp = await setupTestApp();
    dbConnection = getDbConnection();
    authToken = testApp.createAuthToken();

    await testDb.saveTestCountries([
      { name: 'Country A', code: 'CA' },
      { name: 'Country B', code: 'CB' },
    ]);
  });

  describe('POST /persons', () => {
    it('should create a new person with an optional country when authenticated', async () => {
      const country = await dbConnection.getRepository(CountryEntity).findOneByOrFail({ code: 'CA' });

      const response = await testApp
        .request()
        .post('/persons')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          name: 'John Doe',
          countryId: country.id,
        })
        .end();

      expect(response.statusCode).to.equal(201);
      const body = response.json();
      expect(body).to.have.property('id').that.is.a('string');
      expect(body).to.have.property('name', 'John Doe');
      expect(body).to.have.property('countryId', country.id);

      // Verify database state
      const person = await dbConnection.getRepository(PersonEntity).findOne({
        where: { id: body.id },
        relations: ['country'],
      });
      expect(person).to.not.be.null;
      expect(person!.name).to.equal('John Doe');
      expect(person!.country!.id).to.equal(country.id);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp
        .request()
        .post('/persons')
        .body({
          name: 'John Doe',
        })
        .end();

      expect(response.statusCode).to.equal(401);
    });

    it('should fail when country does not exist', async () => {
      const response = await testApp
        .request()
        .post('/persons')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          name: 'John Doe',
          countryId: 'non-existent-id',
        })
        .end();

      expect(response.statusCode).to.equal(500);
    });
  });

  describe('PUT /persons/:id', () => {
    let existingPersonId: string;

    beforeEach(async () => {
      // Create a person to update
      const person = new PersonEntity();
      person.name = 'Original Name';
      const savedPerson = await dbConnection.getRepository(PersonEntity).save(person);
      existingPersonId = savedPerson.id;
    });

    it('should update an existing person when authenticated', async () => {
      const country = await dbConnection.getRepository(CountryEntity).findOneByOrFail({ code: 'CA' });

      const response = await testApp
        .request()
        .put(`/persons/${existingPersonId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          name: 'Updated Name',
          countryId: country.id,
        })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body.id).to.equal(existingPersonId);
      expect(body.name).to.equal('Updated Name');
      expect(body.countryId).to.equal(country.id);

      // Verify database state
      const person = await dbConnection.getRepository(PersonEntity).findOne({
        where: { id: existingPersonId },
        relations: ['country'],
      });
      expect(person!.name).to.equal('Updated Name');
      expect(person!.country!.id).to.equal(country.id);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp
        .request()
        .put(`/persons/${existingPersonId}`)
        .body({
          name: 'Test',
        })
        .end();

      expect(response.statusCode).to.equal(401);
    });

    it('should return 404 for non-existent person', async () => {
      const response = await testApp
        .request()
        .put('/persons/non-existent-id')
        .headers({ Authorization: `Bearer ${authToken}` })
        .body({
          name: 'Test',
        })
        .end();

      expect(response.statusCode).to.equal(404);
    });
  });

  describe('DELETE /persons/:id', () => {
    let existingPersonId: string;

    beforeEach(async () => {
      // Create a person to delete
      const person = new PersonEntity();
      person.name = 'Person to Delete';
      const savedPerson = await dbConnection.getRepository(PersonEntity).save(person);
      existingPersonId = savedPerson.id;
    });

    it('should delete an existing person when authenticated', async () => {
      const response = await testApp
        .request()
        .delete(`/persons/${existingPersonId}`)
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);

      const person = await dbConnection.getRepository(PersonEntity).findOne({
        where: { id: existingPersonId },
      });
      expect(person).to.be.null;
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp.request().delete(`/persons/${existingPersonId}`).end();

      expect(response.statusCode).to.equal(401);
    });

    it('should succeed even if person does not exist', async () => {
      const response = await testApp
        .request()
        .delete('/persons/non-existent-id')
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(204);
    });
  });

  // Add tests for GET /persons
  describe('GET /persons', () => {
    beforeEach(async () => {
      // Create some persons to fetch
      const country = await dbConnection.getRepository(CountryEntity).findOneByOrFail({ code: 'CA' });

      const persons = [
        { name: 'Person A', country },
        { name: 'Person B', country },
      ];

      await testDb.saveTestPersons(persons.map((p) => p.name));
    });

    it('should fetch all persons when authenticated', async () => {
      const response = await testApp
        .request()
        .get('/persons')
        .headers({ Authorization: `Bearer ${authToken}` })
        .end();

      expect(response.statusCode).to.equal(200);
      const body = response.json();
      expect(body).to.be.an('array').that.has.length(2);
      expect(body[0]).to.have.property('id').that.is.a('string');
      expect(body[0]).to.have.property('name').that.is.a('string');
      expect(body[0]).to.have.property('id').that.is.a('string');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await testApp.request().get('/persons').end();

      expect(response.statusCode).to.equal(401);
    });
  });
});
