import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { PersonEntity } from '../../db/entities/Person';
import { DataSource } from 'typeorm';
import { ENV } from '../../env';
import uuid4 from 'uuid4';

describe('PATCH /persons/:id', () => {
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

  it('should update person attributes', async () => {
    const testApp = await setupTestApp();
    const res = await testApp
      .request()
      .patch(`/persons/${existingPerson.id}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'person',
          id: existingPerson.id,
          attributes: {
            name: 'Jane Doe',
            countryCode: 'US',
            bios: [
              { languageCode: 'EN', bio: 'Updated English biography' },
              { languageCode: 'ES', bio: 'Updated Spanish biography' },
            ],
          },
        },
      })
      .end();

    expect(res.statusCode).to.equal(200);

    const person = await res.json();
    expect(person.attributes.name).to.equal('Jane Doe');
    expect(person.attributes.countryCode).to.equal('US');
    // @ts-ignore
    const sortedBios = person.attributes.bios.sort((a, b) => a.languageCode.localeCompare(b.languageCode));
    const expectedBios = [
      { bio: 'Updated English biography', languageCode: 'EN' },
      { bio: 'Updated Spanish biography', languageCode: 'ES' },
    ].sort((a, b) => a.languageCode.localeCompare(b.languageCode));

    expect(sortedBios).to.deep.equal(expectedBios);

    // Verify in database
    const updatedPerson = await dbConnection.getRepository(PersonEntity).findOne({
      where: { id: existingPerson.id },
      relations: ['bios', 'bios.language', 'country'],
    });

    expect(updatedPerson?.name).to.equal('Jane Doe');
    expect(updatedPerson?.country?.code).to.equal('US');
    expect(updatedPerson?.bios).to.have.length(2);
    expect(updatedPerson?.bios?.map((b) => b.bio).sort()).to.deep.equal(
      ['Updated English biography', 'Updated Spanish biography'].sort()
    );
  });

  it('should return 404 when person does not exist', async () => {
    const testApp = await setupTestApp();
    const nonExistentPersonId = uuid4();

    const res = await testApp
      .request()
      .patch(`/persons/${nonExistentPersonId}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'person',
          id: nonExistentPersonId,
          attributes: {
            name: 'Jane Doe',
            countryCode: 'US',
            bios: [
              { languageCode: 'EN', bio: 'Updated English biography' },
              { languageCode: 'ES', bio: 'Updated Spanish biography' },
            ],
          },
        },
      })
      .end();

    expect(res.statusCode).to.equal(404);
    const parsedRes = await res.json();
    expect(parsedRes).to.have.property('error');
  });

  it('should return 409 when updating to an existing person name', async () => {
    const testApp = await setupTestApp();
    // Create another person
    await testDb.saveTestPerson({
      name: 'Jane Doe',
      normalizedName: 'jane-doe',
      countryCode: 'US',
    });

    const res = await testApp
      .request()
      .patch(`/persons/${existingPerson.id}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({
        data: {
          type: 'person',
          id: existingPerson.id,
          attributes: {
            name: 'Jane Doe',
            countryCode: 'US',
            bios: [
              { languageCode: 'EN', bio: 'Updated English biography' },
              { languageCode: 'ES', bio: 'Updated Spanish biography' },
            ],
          },
        },
      })
      .end();

    expect(res.statusCode).to.equal(409);
    const parsedRes = await res.json();
    expect(parsedRes).to.have.property('error');
  });

  it('should return 404 when country does not exist', async () => {
    const updatePersonPayload = {
      type: 'person',
      attributes: {
        countryCode: 'XX',
      },
    };
    const testApp = await setupTestApp();
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
    const testApp = await setupTestApp();

    const res = await testApp
      .request()
      .patch(`/persons/${existingPerson.id}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .body({ data: updatePersonPayload })
      .end();

    expect(res.statusCode).to.equal(404);
  });

  it('should return 401 when not authenticated', async () => {
    const testApp = await setupTestApp();
    const response = await testApp
      .request()
      .patch(`/persons/${existingPerson.id}`)
      .body({
        data: {
          type: 'person',
          attributes: {
            name: 'Jane Doe',
            countryCode: 'US',
          },
        },
      })
      .end();

    expect(response.statusCode).to.equal(401);
  });
});
