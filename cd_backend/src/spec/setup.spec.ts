import chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import { DataSource, DataSourceOptions } from 'typeorm';
import { createDbConnection } from '../db/db';
import { ENV } from '../env';
import { setupTestApp } from './testApp';
import path from 'path';
import { Client } from 'pg';
import fs from 'fs';

chai.use(sinonChai);
chai.should();

let connection: DataSource;
// Track if migrations have been run for this test session
let migrationsApplied = false;

before(async function () {
  this.timeout(30000); // Increase timeout for first-time migration

  // Create the test database or use existing one
  await createTestDatabase();

  // Database connection config
  const dbConfig: Partial<DataSourceOptions> = {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'postgres', // Docker service name from docker-compose
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: ENV.TEST_DATABASE,
    synchronize: false, // Disable automatic schema synchronization
    entities: [`${path.join(__dirname, '../db/entities')}/*.{js,ts}`],
    migrations: [`${path.join(__dirname, '../db/migrations')}/*.{js,ts}`],
    ssl: false, // Disable SSL for Docker PostgreSQL
    extra: {
      ssl: false, // Ensure SSL is disabled at the driver level too
    },
  };

  // If first test run in this session, we'll run migrations
  if (!migrationsApplied) {
    console.log('Setting up test database schema with migrations...');

    // First connect and check if schema exists
    connection = await createDbConnection({
      ...dbConfig,
      migrationsRun: false, // Don't run migrations just yet
    });

    // Check if migrations table exists (indication schema is set up)
    const migrationTableExists = await checkIfMigrationTableExists();

    // Check if required tables exist
    const requiredTables = ['tag_category', 'tag_category_tags', 'name'];
    const missingTables = await checkMissingTables(requiredTables);

    if (!migrationTableExists || missingTables.length > 0) {
      // Drop schema if it was partially created before
      await connection.query('DROP SCHEMA IF EXISTS public CASCADE');
      await connection.query('CREATE SCHEMA public');
      await connection.query('GRANT ALL ON SCHEMA public TO postgres');
      await connection.query('GRANT ALL ON SCHEMA public TO public');

      // Close connection so we can reconnect with migrations
      await connection.destroy();

      // Reconnect with migrations enabled
      connection = await createDbConnection({
        ...dbConfig,
        migrationsRun: true, // Run migrations to set up schema
      });

      console.log('Migrations applied successfully.');
    } else {
      console.log('Using existing database schema (migrations already applied).');
    }

    // Mark migrations as applied for this test session
    migrationsApplied = true;
  } else {
    // For subsequent test runs, use the existing schema
    connection = await createDbConnection({
      ...dbConfig,
      migrationsRun: false, // Skip migrations for faster startup
    });
  }

  await setupTestApp();
});

afterEach(async () => {
  await cleanupTables();
  sinon.restore();
});

after(async () => {
  await cleanupTables();
  await closeDatabaseConnection();
});

async function checkIfMigrationTableExists() {
  try {
    const result = await connection.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      )
    `);
    return result[0].exists;
  } catch (e) {
    return false;
  }
}

async function checkMissingTables(requiredTables: string[]): Promise<string[]> {
  try {
    const missingTables: string[] = [];
    for (const table of requiredTables) {
      const result = await connection.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `,
        [table]
      );
      if (!result[0].exists) {
        missingTables.push(table);
      }
    }
    return missingTables;
  } catch (e) {
    return requiredTables; // If we can't check, assume all tables are missing
  }
}

async function cleanupTables() {
  if (connection && connection.isInitialized) {
    const entities = connection.entityMetadatas;

    // Execute truncate on each table while respecting foreign keys
    await connection.query('SET session_replication_role = replica;'); // Disable triggers temporarily
    for (const entity of entities) {
      try {
        await connection.query(`TRUNCATE TABLE "${entity.tablePath}" CASCADE;`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Error truncating table ${entity.tablePath}: ${errorMessage}`);
      }
    }
    await connection.query('SET session_replication_role = default;'); // Re-enable triggers
  }
}

async function closeDatabaseConnection() {
  if (connection && connection.isInitialized) {
    await connection.destroy();
  }
}

async function createTestDatabase() {
  // Default to a dedicated test database name
  const testDbName = process.env.TEST_DATABASE || 'cd_backend_test';

  // Set the test database name in the environment
  ENV.TEST_DATABASE = testDbName;

  // Create the test database if it doesn't exist
  const client = new Client({
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default postgres database
    ssl: false,
  });

  try {
    await client.connect();

    // Check if database exists
    const dbCheckResult = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [testDbName]);

    // Create database if it doesn't exist
    if (dbCheckResult.rows.length === 0) {
      console.log(`Creating test database: ${testDbName}`);
      // Disconnect clients from database if they exist
      await client.query(
        `SELECT pg_terminate_backend(pg_stat_activity.pid)
                          FROM pg_stat_activity
                          WHERE pg_stat_activity.datname = $1
                          AND pid <> pg_backend_pid()`,
        [testDbName]
      );
      // Create the database
      await client.query(`CREATE DATABASE ${testDbName}`);
    } else {
      console.log(`Using existing test database: ${testDbName}`);
    }
  } catch (error) {
    console.error('Error creating test database:', error);
    throw error;
  } finally {
    await client.end();
  }
}
