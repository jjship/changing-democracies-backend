import { expect } from 'chai';
import { createDbConnection, getDbConnection } from './db';
import { FragmentEntity } from './entities/Fragment';
import { env } from '../env';
import { DataSource } from 'typeorm';
import uuid from 'uuid4';
import { PersonEntity } from './entities/Person';
import { CountryEntity } from './entities/Country';
import { BioEntity } from './entities/Bio';
import { TagEntity } from './entities/Tag';
import { NarrativeEntity } from './entities/Narrative';
import { NarrativeFragmentEntity } from './entities/NarrativeFragment';

describe('Example Test', () => {
  it('should pass', () => {
    expect(1 + 1).to.equal(2);
  });
});

describe('Database', () => {
  before(async function () {
    this.timeout(10000);
    await createTestDatabase();

    await createDbConnection({
      database: env.TEST_DATABASE,
    });
  });

  beforeEach(async () => {
    const connection = getDbConnection();
    await clearDatabase(connection);
  });

  after(async () => {
    const connection = getDbConnection();
    await connection.destroy();
  });

  it('should insert and retrieve test data', async () => {
    const testFragmentId = uuid();
    let testTag: TagEntity | undefined;
    let testNarrativeFragment: NarrativeFragmentEntity | undefined;

    const connection = getDbConnection();

    await connection.transaction(async (entityManager) => {
      const testCountry = new CountryEntity();
      testCountry.name = 'testCountry';
      await entityManager.save(CountryEntity, testCountry);

      const testBio = new BioEntity();
      testBio.bio = 'lorem ipsum i tak dalej';
      testBio.language_code = 'PL';
      await entityManager.save(BioEntity, testBio);

      testTag = new TagEntity();
      testTag.name = 'test_tag';
      await entityManager.save(TagEntity, testTag);

      const testPerson = new PersonEntity();
      testPerson.name = 'testName testSurname';
      testPerson.bios = [testBio];
      testPerson.country = testCountry;
      await entityManager.save(PersonEntity, testPerson);

      const testFragment = new FragmentEntity();
      testFragment.id = testFragmentId;
      testFragment.title = 'Test FragmentEntity';
      testFragment.duration_sec = 120;
      testFragment.player_url = 'http://example.com/player';
      testFragment.thumbnail_url = 'http://example.com/thumbnail';
      testFragment.person = testPerson;
      testFragment.tags = [testTag];
      await entityManager.save(FragmentEntity, testFragment);

      const testNarrative = new NarrativeEntity();
      testNarrative.title = 'Test Narrative';
      testNarrative.description = 'description';
      await entityManager.save(NarrativeEntity, testNarrative);

      testNarrativeFragment = new NarrativeFragmentEntity();
      testNarrativeFragment.narrative = testNarrative;
      testNarrativeFragment.fragment = testFragment;
      testNarrativeFragment.sequence = 0;
      await entityManager.save(NarrativeFragmentEntity, testNarrativeFragment);
    });

    const fragmentRepository = connection.getRepository(FragmentEntity);

    const dbFragment = await fragmentRepository.findOne({
      where: { id: testFragmentId },
      relations: [
        'person',
        'person.country',
        'person.bios',
        'tags',
        'narrativeFragments',
        'narrativeFragments.fragment',
        'narrativeFragments.narrative',
      ],
    });

    expect(dbFragment!.title).to.equal('Test FragmentEntity');
    expect(dbFragment!.person!.name).to.equal('testName testSurname');
    expect(dbFragment!.person!.country!.name).to.equal('testCountry');
    expect(dbFragment!.tags).to.deep.equal([testTag]);
    expect(dbFragment?.narrativeFragments![0].id).to.equal(testNarrativeFragment!.id);
  });
});

async function createTestDatabase() {
  const adminConnection = new DataSource({
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: 'postgres', // Use the default postgres database
    synchronize: false,
    logging: false,
  });

  await adminConnection.initialize();

  await adminConnection.query(`DROP DATABASE IF EXISTS "${env.TEST_DATABASE}"`);
  await adminConnection.query(`CREATE DATABASE "${env.TEST_DATABASE}"`);
  await adminConnection.destroy();
}

async function clearDatabase(connection: DataSource) {
  const entities = connection.entityMetadatas;

  for (const entity of entities) {
    const repository = connection.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE`);
  }
}
