import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { PersonEntity } from '../../db/entities/Person';
import { DataSource } from 'typeorm';

describe('PATCH /persons/:id', () => {
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
      { code: 'FR', name: 'French' },
    ]);

    await testDb.saveTestCountries([
      { code: 'US', name: 'United States' },
      { code: 'FR', name: 'France' },
    ]);

    // Create an initial person to update
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

  it('should update person attributes', async () => {
    const updatePersonPayload = {
      type: 'person',
      attributes: {
        name: 'Jane Doe',
        countryCode: 'FR',
        bios: [
          {
            languageCode: 'en',
            bio: 'Updated English biography',
          },
          {
            languageCode: 'fr',
            bio: 'French biography',
          },
        ],
      },
    };

    const res = await testApp
      .request()
      .patch(`/persons/${existingPerson.id}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({ data: updatePersonPayload })
      .end();

    expect(res.statusCode).to.equal(200);

    const updatedPerson = await dbConnection.getRepository(PersonEntity).findOne({
      where: { id: existingPerson.id },
      relations: ['bios', 'bios.language', 'country'],
    });

    expect(updatedPerson).to.not.be.null;
    expect(updatedPerson!.name).to.equal(updatePersonPayload.attributes.name);
    expect(updatedPerson!.country!.code).to.equal(updatePersonPayload.attributes.countryCode);
    expect(updatedPerson!.bios).to.have.length(2);

    const parsedRes = await res.json();
    const { bios, ...otherAttributes } = parsedRes.attributes;

    expect(otherAttributes).to.deep.equal({
      name: 'Jane Doe',
      countryCode: 'FR',
    });

    // @ts-ignore
    const sortedBios = bios.sort((a, b) => a.languageCode.localeCompare(b.languageCode));
    const expectedBios = [
      { bio: 'Updated English biography', languageCode: 'EN' },
      { bio: 'French biography', languageCode: 'FR' },
    ].sort((a, b) => a.languageCode.localeCompare(b.languageCode));

    expect(sortedBios).to.deep.equal(expectedBios);
  });

  it('should return 404 when person does not exist', async () => {
    const updatePersonPayload = {
      type: 'person',
      attributes: {
        name: 'Jane Doe',
        countryCode: 'US',
      },
    };

    const res = await testApp
      .request()
      .patch('/persons/non-existent-id')
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({ data: updatePersonPayload })
      .end();

    expect(res.statusCode).to.equal(404);
  });

  it('should return 409 when updating to existing person name', async () => {
    // Create another person first
    await testDb.saveTestPerson({
      name: 'Jane Doe',
      normalizedName: 'jane-doe',
      countryCode: 'US',
    });

    const updatePersonPayload = {
      type: 'person',
      attributes: {
        name: 'Jane Doe',
        countryCode: 'US',
      },
    };

    const res = await testApp
      .request()
      .patch(`/persons/${existingPerson.id}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({ data: updatePersonPayload })
      .end();

    expect(res.statusCode).to.equal(409);
  });

  it('should return 404 when country does not exist', async () => {
    const updatePersonPayload = {
      type: 'person',
      attributes: {
        countryCode: 'XX',
      },
    };

    const res = await testApp
      .request()
      .patch(`/persons/${existingPerson.id}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({ data: updatePersonPayload })
      .end();

    expect(res.statusCode).to.equal(404);
  });

  it('should return 404 when language does not exist', async () => {
    const updatePersonPayload = {
      type: 'person',
      attributes: {
        countryCode: 'US',
        bios: [
          {
            languageCode: 'xx',
            bio: 'Invalid language biography',
          },
        ],
      },
    };

    const res = await testApp
      .request()
      .patch(`/persons/${existingPerson.id}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({ data: updatePersonPayload })
      .end();

    expect(res.statusCode).to.equal(404);
  });
});
