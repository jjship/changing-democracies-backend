import { expect } from 'chai';
import { createDbConnection, getDbConnection } from './db';
import { Fragment } from './entities/Fragment';
import { env } from '../env';

describe('Example Test', () => {
  it('should pass', () => {
    expect(1 + 1).to.equal(2);
  });
});

describe('Database', () => {
  before(async () => {
    await createTestDatabase();

    await createDbConnection({
      database: env.TEST_DATABASE,
    });

    console.log({ connection: getDbConnection() });
  });

  after(async () => {
    const connection = getDbConnection();
    await connection.destroy();
  });

  it('should insert and retrive test data', async () => {
    const connection = getDbConnection();
    const fragmentRepository = connection.getRepository(Fragment);

    const testFragment = new Fragment();
    testFragment.fragment_id = 'test-id';
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
  console.log('BEFORE');
  const localConnection = await createDbConnection({
    database: env.DB_DATABASE,
    migrationsRun: false,
  });

  console.log('AFTER');

  await localConnection.query(`DROP DATABASE IF EXISTS "${env.TEST_DATABASE}"`);
  await localConnection.query(`CREATE DATABASE "${env.TEST_DATABASE}"`);
  await localConnection.destroy();
}
