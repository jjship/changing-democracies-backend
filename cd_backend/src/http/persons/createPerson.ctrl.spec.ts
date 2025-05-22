import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { PersonEntity } from '../../db/entities/Person';
import { DataSource } from 'typeorm';
import { ENV } from '../../env';

describe('POST /persons', () => {
  let dbConnection: DataSource;
  let authToken: string;

  beforeEach(async () => {
    dbConnection = getDbConnection();
    authToken = (await setupTestApp()).createAuthToken();

    await testDb.saveTestLanguages([
      { code: 'EN', name: 'English' },
      { code: 'ES', name: 'Spanish' },
    ]);

    await testDb.saveTestCountries([{ code: 'US', name: 'United States' }]);
  });

  it('should create a new person', async () => {
    const testApp = await setupTestApp();
    const res = await testApp
      .request()
      .post('/persons')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'person',
          attributes: {
            name: 'John Doe',
            countryCode: 'US',
            bios: [
              { languageCode: 'EN', bio: 'English biography' },
              { languageCode: 'ES', bio: 'Spanish biography' },
            ],
          },
        },
      })
      .end();

    expect(res.statusCode).to.equal(201);

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

    // Verify in database
    const createdPerson = await dbConnection.getRepository(PersonEntity).findOne({
      where: { id: person.id },
      relations: ['bios', 'bios.language', 'country'],
    });

    expect(createdPerson?.name).to.equal('John Doe');
    expect(createdPerson?.country?.code).to.equal('US');
    expect(createdPerson?.bios).to.have.length(2);
    expect(createdPerson?.bios?.map((b) => b.bio).sort()).to.deep.equal(
      ['English biography', 'Spanish biography'].sort()
    );
  });

  it('should return 409 when creating a person with an existing name', async () => {
    const testApp = await setupTestApp();
    // Create a person first
    await testDb.saveTestPerson({
      name: 'John Does',
      normalizedName: 'john-does',
      countryCode: 'US',
    });

    const res = await testApp
      .request()
      .post('/persons')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'person',
          attributes: {
            name: 'John Does',
            countryCode: 'US',
            bios: [
              { languageCode: 'EN', bio: 'English biography' },
              { languageCode: 'ES', bio: 'Spanish biography' },
            ],
          },
        },
      })
      .end();

    expect(res.statusCode).to.equal(409);
  });
});
