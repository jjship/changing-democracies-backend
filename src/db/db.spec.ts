import { expect } from 'chai';
import { createDbConnection, getDbConnection } from './db';
import { Fragment } from './entities/Fragment';

describe('Example Test', () => {
  it('should pass', () => {
    expect(1 + 1).to.equal(2);
  });
});

describe('Database', () => {
  before(async () => {
    await createDbConnection({
      database: 'test-db',
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
