import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { PersonEntity } from '../../db/entities/Person';
import { DataSource } from 'typeorm';
import { parse } from 'path';

describe('POST /persons', () => {
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
  });

  it('should save the new person in db', async () => {
    const createPersonPayload = {
      type: 'person',
      attributes: {
        name: 'John Doe',
        countryCode: 'US',
        bios: [
          {
            languageCode: 'en',
            bio: 'English biography',
          },
          {
            languageCode: 'es',
            bio: 'Spanish biography',
          },
        ],
      },
    };

    const res = await testApp
      .request()
      .post('/persons')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({ data: createPersonPayload })
      .end();

    const parsedRes = await res.json();

    const [newPerson] = await dbConnection.getRepository(PersonEntity).find({
      relations: ['bios', 'bios.language', 'country'],
    });

    expect(newPerson).to.not.be.null;
    expect(newPerson!.name).to.equal(createPersonPayload.attributes.name);
    expect(newPerson!.country!.code).to.equal(createPersonPayload.attributes.countryCode);
    expect(newPerson!.bios).to.have.length(2);

    const { createdAt, updatedAt, bios, ...otherAttributes } = parsedRes.attributes;

    expect(otherAttributes).to.deep.equal({
      name: 'John Doe',
      countryCode: 'US',
    });
    // @ts-ignore
    const sortedBios = bios.sort((a, b) => a.languageCode.localeCompare(b.languageCode));
    const expectedBios = [
      { bio: 'English biography', languageCode: 'EN' },
      { bio: 'Spanish biography', languageCode: 'ES' },
    ].sort((a, b) => a.languageCode.localeCompare(b.languageCode));

    expect(sortedBios).to.deep.equal(expectedBios);
  });
});
