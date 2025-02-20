import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { DataSource } from 'typeorm';

describe('GET /persons', () => {
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

    await testDb.saveTestCountries([{ code: 'US', name: 'United States' }]);

    await testDb.saveTestPerson({
      name: 'John Doe',
      countryCode: 'US',
      bios: [
        { languageCode: 'EN', bio: 'English biography' },
        { languageCode: 'ES', bio: 'Spanish biography' },
      ],
    });
  });

  it('should retrieve all persons', async () => {
    const res = await testApp
      .request()
      .get('/persons')
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    expect(res.statusCode).to.equal(200);
    console.log(res.json());

    const persons = await res.json();
    expect(persons).to.have.length(1);
    expect(persons[0].attributes.name).to.equal('John Doe');
    expect(persons[0].attributes.countryCode).to.equal('US');
    // @ts-ignore
    const sortedBios = persons[0].attributes.bios.sort((a, b) => a.languageCode.localeCompare(b.languageCode));
    const expectedBios = [
      { bio: 'English biography', languageCode: 'EN' },
      { bio: 'Spanish biography', languageCode: 'ES' },
    ].sort((a, b) => a.languageCode.localeCompare(b.languageCode));

    expect(sortedBios).to.deep.equal(expectedBios);
  });
});
