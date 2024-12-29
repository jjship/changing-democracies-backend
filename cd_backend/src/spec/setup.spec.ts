import chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import { DataSource } from 'typeorm';
import { createDbConnection } from '../db/db';
import { ENV } from '../env';
import { setupTestApp } from './testApp';

chai.use(sinonChai);
chai.should();

let connection: DataSource;

before(async function () {
  this.timeout(10000);

  await createTestDatabase();

  connection = await createDbConnection({
    database: ENV.TEST_DATABASE,
    connectTimeoutMS: 1900,
    extra: {
      // query timeout, to early identification of slow queries
      statement_timeout: 1900,
      // ensures the connection doesn't terminate when we're using fake timers
      // https://node-postgres.com/api/pool#constructor
      idleTimeoutMillis: 0,
      max: 1,
    },
  });

  await setupTestApp();
});

afterEach(async () => {
  await cleanupTables();
  sinon.restore();
});

after(async () => {
  await closeDatabaseConnection();
});

async function cleanupTables() {
  if (connection) {
    await connection.transaction(async (manager) => {
      // this mode disables all database triggers, constraints etc.
      // without it, it is not possible to delete rows that have relations.
      // additionally it increases performance of the process
      await manager.query('SET session_replication_role = replica');

      for (const entityMeta of manager.connection.entityMetadatas) {
        await manager.delete(entityMeta.target, {});
      }

      await manager.query('SET session_replication_role = DEFAULT');
    });
  }
}

async function closeDatabaseConnection() {
  if (connection) {
    await connection.destroy();
  }
}
async function createTestDatabase() {
  const adminConnection = new DataSource({
    type: 'postgres',
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    username: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
    database: 'postgres', // Use the default postgres database
    synchronize: false,
    logging: false,
  });

  await adminConnection.initialize();

  await adminConnection.query(`DROP DATABASE IF EXISTS "${ENV.TEST_DATABASE}"`);
  await adminConnection.query(`CREATE DATABASE "${ENV.TEST_DATABASE}"`);
  await adminConnection.destroy();
}
