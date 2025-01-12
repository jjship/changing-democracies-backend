import chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import { DataSource } from 'typeorm';
import { createDbConnection } from '../db/db';
import { ENV } from '../env';
import { setupTestApp } from './testApp';
import path from 'path';
import fs from 'fs';
import { testDb } from './testDb';

chai.use(sinonChai);
chai.should();

let connection: DataSource;

before(async function () {
  this.timeout(10000);

  await createTestDatabase();

  connection = await createDbConnection({
    database: ENV.TEST_DATABASE,
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
    const entities = connection.entityMetadatas;

    await connection.query('PRAGMA foreign_keys = OFF;'); // Disable foreign key constraints
    for (const entity of entities) {
      const repository = connection.getRepository(entity.name);
      await repository.query(`DELETE FROM "${entity.tableName}"`);
    }
    await connection.query('PRAGMA foreign_keys = ON;'); // Re-enable foreign key constraints
  }
}

async function closeDatabaseConnection() {
  if (connection) {
    await connection.destroy();
  }
}
async function createTestDatabase() {
  const dbPath = path.join(__dirname, '../data/test-database.sqlite');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath); // Remove the existing test database file
  }
  ENV.TEST_DATABASE = dbPath; // Set the test database path in the environment variable
}
