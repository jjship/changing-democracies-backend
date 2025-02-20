import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { PersonEntity } from '../../db/entities/Person';
import { DataSource } from 'typeorm';

describe('GET /person', () => {
  let dbConnection: DataSource;
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  let authToken: string;
  let existingPerson: PersonEntity;

  beforeEach(async () => {
    testApp = await setupTestApp();
    dbConnection = getDbConnection();
    authToken = testApp.createAuthToken();

    await testDb.saveTestLanguages([
      { code: 'EN', name: 'English' },
      { code: 'ES', name: 'Spanish' },
    ]);

    await testDb.saveTestCountries([{ code: 'US', name: 'United States' }]);

    existingPerson = await testDb.saveTestPerson({
      name: 'John Doe',
      countryCode: 'US',
      bios: [
        { languageCode: 'EN', bio: 'English biography' },
        { languageCode: 'ES', bio: 'Spanish biography' },
      ],
    });
  });

  it('should retrieve a person by id', async () => {
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
    const res = await testApp
      .request()
      .get('/person?id=non-existent-id')
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    expect(res.statusCode).to.equal(404);
  });
});
