import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { PersonEntity } from '../../db/entities/Person';
import { DataSource } from 'typeorm';
import { ENV } from '../../env';
import uuid4 from 'uuid4';

describe('GET /person', () => {
  let dbConnection: DataSource;
  let authToken: string;
  let existingPerson: PersonEntity;
  const apiKey = ENV.CLIENT_API_KEY;

  beforeEach(async () => {
    dbConnection = getDbConnection();
    authToken = (await setupTestApp()).createAuthToken();

    await testDb.saveTestLanguages([
      { code: 'EN', name: 'English' },
      { code: 'ES', name: 'Spanish' },
    ]);

    await testDb.saveTestCountries([{ code: 'US', name: 'United States' }]);

    existingPerson = await testDb.saveTestPerson({
      name: 'John Doe',
      normalizedName: 'john-doe',
      countryCode: 'US',
      bios: [
        { languageCode: 'EN', bio: 'English biography' },
        { languageCode: 'ES', bio: 'Spanish biography' },
      ],
    });
  });

  it('should retrieve a person by id', async () => {
    const testApp = await setupTestApp();
    const res = await testApp
      .request()
      .get(`/person?id=${existingPerson.id}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    expect(res.statusCode).to.equal(200);

    const person = await res.json();
    expect(person.attributes.name).to.equal('John Doe');
    expect(person.attributes.countryCode).to.equal('US');
    // @ts-ignore
    const sortedBios = person.attributes.bios.sort((a, b) => a.languageCode.localeCompare(b.languageCode));
    const expectedBios = [
      { bio: 'English biography', languageCode: 'EN' },
      { bio: 'Spanish biography', languageCode: 'ES' },
    ].sort((a, b) => a.languageCode.localeCompare(b.languageCode));

    expect(sortedBios).to.deep.equal(expectedBios);
  });

  it('should retrieve a person by name', async () => {
    const testApp = await setupTestApp();
    const res = await testApp
      .request()
      .get(`/person?name=${existingPerson.name}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    expect(res.statusCode).to.equal(200);

    const person = await res.json();
    expect(person.attributes.name).to.equal('John Doe');
    expect(person.attributes.countryCode).to.equal('US');
    // @ts-ignore
    const sortedBios = person.attributes.bios.sort((a, b) => a.languageCode.localeCompare(b.languageCode));
    const expectedBios = [
      { bio: 'English biography', languageCode: 'EN' },
      { bio: 'Spanish biography', languageCode: 'ES' },
    ].sort((a, b) => a.languageCode.localeCompare(b.languageCode));

    expect(sortedBios).to.deep.equal(expectedBios);
  });

  it('should return 404 when person does not exist', async () => {
    const testApp = await setupTestApp();
    const nonExistentPersonId = uuid4();

    const res = await testApp
      .request()
      .get('/person')
      .headers({ Authorization: `Bearer ${authToken}` })
      .query({ id: nonExistentPersonId })
      .end();

    expect(res.statusCode).to.equal(404);
    const parsedRes = await res.json();
    expect(parsedRes).to.have.property('error');
  });
});
