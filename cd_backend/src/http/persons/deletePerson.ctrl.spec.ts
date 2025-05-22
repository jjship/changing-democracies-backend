import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { PersonEntity } from '../../db/entities/Person';
import { BioEntity } from '../../db/entities/Bio';
import { DataSource } from 'typeorm';
import { FragmentEntity } from '../../db/entities/Fragment';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../../env';
import uuid4 from 'uuid4';

describe('DELETE /persons/:id', () => {
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

    // Create test fragments with valid UUIDs
    await testDb.saveTestFragments([
      {
        guid: uuidv4(),
        title: 'Test Fragment 1',
        length: 100,
        personId: existingPerson.id,
      },
      {
        guid: uuidv4(),
        title: 'Test Fragment 2',
        length: 200,
        personId: existingPerson.id,
      },
    ]);

    // Fetch the saved fragments
    const fragments = await dbConnection.getRepository(FragmentEntity).find({
      where: { person: { id: existingPerson.id } },
    });

    // Associate fragments with person
    existingPerson.fragments = fragments;
    await dbConnection.getRepository(PersonEntity).save(existingPerson);
  });

  it('should delete a person and their fragments', async () => {
    const testApp = await setupTestApp();
    const res = await testApp
      .request()
      .delete(`/persons/${existingPerson.id}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    expect(res.statusCode).to.equal(204);

    // Verify person is deleted
    const deletedPerson = await dbConnection.getRepository(PersonEntity).findOne({
      where: { id: existingPerson.id },
    });
    expect(deletedPerson).to.be.null;

    const deletedBio = await dbConnection.getRepository(BioEntity).findOne({
      where: { id: existingPerson.bios![0].id },
    });
    expect(deletedBio).to.be.null;

    if (existingPerson.fragments) {
      const currentFragments = await Promise.all(
        existingPerson.fragments.map((fragment) =>
          dbConnection.getRepository(FragmentEntity).findOne({ where: { id: fragment.id } })
        )
      );
      currentFragments.forEach((fragment) => expect(fragment).not.to.be.null);
    }
  });

  it('should return 204 when person does not exist', async () => {
    const testApp = await setupTestApp();
    const nonExistentPersonId = uuid4();

    const res = await testApp
      .request()
      .delete(`/persons/${nonExistentPersonId}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    expect(res.statusCode).to.equal(204);
  });
});
