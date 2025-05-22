import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { PersonEntity } from '../../db/entities/Person';
import { DataSource } from 'typeorm';
import { ENV } from '../../env';

describe('GET /persons', () => {
  let dbConnection: DataSource;
  let authToken: string;
  let existingPersons: PersonEntity[];
  const apiKey = ENV.CLIENT_API_KEY;

  beforeEach(async () => {
    dbConnection = getDbConnection();
    authToken = (await setupTestApp()).createAuthToken();

    await testDb.saveTestLanguages([
      { code: 'EN', name: 'English' },
      { code: 'ES', name: 'Spanish' },
    ]);

    await testDb.saveTestCountries([{ code: 'US', name: 'United States' }]);

    existingPersons = await Promise.all(
      ['John Doe', 'Jane Doe', 'Bob Smith'].map((name) =>
        testDb.saveTestPerson({
          name,
          normalizedName: name.toLowerCase().replace(/\s+/g, '-'),
          countryCode: 'US',
          bios: [
            { languageCode: 'EN', bio: `${name}'s English biography` },
            { languageCode: 'ES', bio: `${name}'s Spanish biography` },
          ],
        })
      )
    );
  });

  it('should retrieve all persons', async () => {
    const testApp = await setupTestApp();
    const res = await testApp
      .request()
      .get('/persons')
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    expect(res.statusCode).to.equal(200);

    const persons = await res.json();
    expect(persons).to.have.length(3);

    const sortedPersons = persons.sort((a: any, b: any) => a.attributes.name.localeCompare(b.attributes.name));
    expect(sortedPersons[0].attributes.name).to.equal('Bob Smith');
    expect(sortedPersons[1].attributes.name).to.equal('Jane Doe');
    expect(sortedPersons[2].attributes.name).to.equal('John Doe');
  });
});
