import { expect } from 'chai';
import { createDbConnection, getDbConnection } from './db';
import { Fragment } from './entities/Fragment';
import { env } from '../env';
import { DataSource } from 'typeorm';
import uuid from 'uuid4';

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
    await fragmentRepository.save(testFragment);

    // Retrieve and print test data
    const fragments = await fragmentRepository.find();

    console.log(fragments);

    expect(fragments).to.have.lengthOf(1);
    expect(fragments[0].title).to.equal('Test Fragment');
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
