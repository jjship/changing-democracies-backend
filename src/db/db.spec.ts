import { expect } from 'chai';
import { createDbConnection, getDbConnection } from './db';
import { Fragment } from './entities/Fragment';
import { env } from '../env';
import { DataSource } from 'typeorm';
import uuid from 'uuid4';
import { Person } from './entities/Person';
import { Country } from './entities/Country';
import { Bio } from './entities/Bio';
import { Tag } from './entities/Tag';

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
    const connection = getDbConnection();

    const countryRepository = connection.getRepository(Country);
    const testCountry = new Country();
    testCountry.name = 'testCountry';
    await countryRepository.save(testCountry);

    const bioRepository = connection.getRepository(Bio);
    const testBio = new Bio();
    testBio.bio = 'lorem ipsum i tak dalej';
    testBio.language_code = 'PL';
    await bioRepository.save(testBio);

    const tagRepository = connection.getRepository(Tag);
    const testTag = new Tag();
    testTag.name = 'test_tag';
    await tagRepository.save(testTag);

    const personRepository = connection.getRepository(Person);
    const testPerson = new Person();
    testPerson.name = 'testName testSurname';
    testPerson.bios = [testBio];
    testPerson.country = testCountry;
    await personRepository.save(testPerson);

    const fragmentRepository = connection.getRepository(Fragment);
    const testFragment = new Fragment();
    testFragment.fragment_id = uuid();
    testFragment.title = 'Test Fragment';
    testFragment.length = 120;
    testFragment.player_url = 'http://example.com/player';
    testFragment.thumbnail_url = 'http://example.com/thumbnail';
    testFragment.person = testPerson;
    testFragment.tags = [testTag];
    await fragmentRepository.save(testFragment);

    const dbFragment = await fragmentRepository.findOne({
      where: { fragment_id: testFragment.fragment_id },
      relations: ['person', 'person.country', 'person.bios', 'tags'],
    });

    expect(dbFragment?.title).to.equal('Test Fragment');
    expect(dbFragment?.person.name).to.equal('testName testSurname');
    expect(dbFragment?.person.country.name).to.equal('testCountry');
    expect(dbFragment?.tags[0].name).to.equal('test_tag');
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
