import { setupTestApp } from '../../spec/testApp';
import { testDb } from '../../spec/testDb';
import { expect } from 'chai';
import { getDbConnection } from '../../db/db';
import { PersonEntity } from '../../db/entities/Person';
import { BioEntity } from '../../db/entities/Bio';
import { DataSource } from 'typeorm';
import { FragmentEntity } from '../../db/entities/Fragment';

describe('DELETE /persons/:id', () => {
  let dbConnection: DataSource;
  let testApp: Awaited<ReturnType<typeof setupTestApp>>;
  let authToken: string;
  let existingPerson: PersonEntity;
  let existingFragments: any[];

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
      normalizedName: 'john-doe',
      countryCode: 'US',
      bios: [
        { languageCode: 'EN', bio: 'English biography' },
        { languageCode: 'ES', bio: 'Spanish biography' },
      ],
    });

    await testDb.saveTestFragments([
      { guid: '123', title: 'Fragment 1', length: 100, personId: existingPerson.id },
      { guid: '456', title: 'Fragment 2', length: 200, personId: existingPerson.id },
    ]);

    existingFragments = await dbConnection.getRepository(FragmentEntity).find({
      where: { person: { id: existingPerson.id } },
    });
  });

  it('should delete a person and their fragments by id', async () => {
    const res = await testApp
      .request()
      .delete(`/persons/${existingPerson.id}`)
      .headers({ Authorization: `Bearer ${authToken}` })
      .end();

    expect(res.statusCode).to.equal(204);

    const deletedPerson = await dbConnection.getRepository(PersonEntity).findOne({
      where: { id: existingPerson.id },
    });

    const deletedBio = await dbConnection.getRepository(BioEntity).findOne({
      where: { id: existingPerson.bios![0].id },
    });
    const currentFragments = await Promise.all(
      existingFragments.map((fragment) =>
        dbConnection.getRepository('FragmentEntity').findOne({ where: { id: fragment.id } })
      )
    );

    expect(deletedPerson).to.be.null;
    expect(deletedBio).to.be.null;
    currentFragments.forEach((fragment) => expect(fragment).not.to.be.null);
  });
});
