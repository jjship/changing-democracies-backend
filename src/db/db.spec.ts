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

  after(async () => {
    const connection = getDbConnection();
    await connection.destroy();
  });

  it('should insert and retrive test data', async () => {
    const connection = getDbConnection();

    const fragmentRepository = connection.getRepository(Fragment);
    const testFragment = new Fragment();
    testFragment.fragment_id = uuid();
    testFragment.title = 'Test Fragment';
    testFragment.length = 120;
    testFragment.player_url = 'http://example.com/player';
    testFragment.thumbnail_url = 'http://example.com/thumbnail';
    const { fragment_id } = await fragmentRepository.save(testFragment);

    const countryRepository = connection.getRepository(Country);
    const testCountry = new Country();
    testCountry.name = 'testCountry';
    const { country_id } = await countryRepository.save(testCountry);

    const bioRepository = connection.getRepository(Bio);
    const testBio = new Bio();
    testBio.bio = 'lorem ipsum i tak dalej';
    testBio.language_code = 'PL';
    const { bio_id } = await bioRepository.save(testBio);

    const tagRepository = connection.getRepository(Tag);
    const testTag = new Tag();
    testTag.name = 'test_tag';
    const { tag_id } = await tagRepository.save(testTag);

    const personRepository = connection.getRepository(Person);
    const testPerson = new Person();
    testPerson.name = 'testName testSurname';
    const { person_id } = await personRepository.save(testPerson);

    testFragment.person = testPerson;
    await fragmentRepository.save(testFragment);

    const dbFragment = await fragmentRepository.findOne({ where: { fragment_id: fragment_id }, relations: ['person'] });
    console.log(dbFragment);

    // expect(fragments).to.have.lengthOf(1);
    expect(dbFragment?.title).to.equal('Test Fragment');
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
