import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import path from 'path';
import { performance } from 'perf_hooks';
import { ENV } from '../src/env';
config();

// SQLite connection
const sqliteConnection = new DataSource({
  type: 'sqlite',
  database: path.join(process.cwd(), 'data', ENV.DB_DATABASE),
  entities: [`${__dirname}/../cd_backend/src/db/entities/*.{js,ts}`],
  synchronize: false,
  logging: ['error'],
});

// Neon DB connection
const neonConnection = new DataSource({
  type: 'postgres',
  host: ENV.NEON_DB_HOST,
  port: parseInt(ENV.NEON_DB_PORT || '5432'),
  username: ENV.NEON_DB_USERNAME,
  password: ENV.NEON_DB_PASSWORD,
  database: ENV.NEON_DB_DATABASE,
  ssl: ENV.NEON_DB_SSL,
  entities: [`${__dirname}/../cd_backend/src/db/entities/*.{js,ts}`],
  synchronize: false,
  logging: ['error'],
});

// The problematic query (simplified version for testing)
async function runClientNarrativesQuery(connection: DataSource) {
  const start = performance.now();

  // Execute the query
  const result = await connection.query(`
    SELECT 
      n.id as narrative_id, 
      n."totalDurationSec",
      nf.sequence,
      f.id as fragment_id,
      f.title as fragment_title,
      f."durationSec",
      f."playerUrl",
      f."thumbnailUrl",
      p.id as person_id,
      p.name as person_name,
      c.id as country_id,
      c.code as country_code
    FROM 
      narrative n
    LEFT JOIN 
      narrative_fragment nf ON n.id = nf."narrativeId"
    LEFT JOIN 
      fragment f ON nf."fragmentId" = f.id
    LEFT JOIN 
      person p ON f."personId" = p.id
    LEFT JOIN 
      country c ON p."countryId" = c.id
    ORDER BY 
      n.id, nf.sequence
  `);

  const end = performance.now();
  return {
    executionTime: end - start,
    resultCount: result.length,
  };
}

// Function to create additional indexes for PostgreSQL
async function createOptimizedIndexes(connection: DataSource) {
  if (connection.options.type !== 'postgres') {
    console.log('Not PostgreSQL, skipping index creation');
    return;
  }

  console.log('Creating optimized indexes for the clientNarratives query...');

  try {
    // Add covering indexes for the clientNarratives query
    await connection.query(
      `CREATE INDEX IF NOT EXISTS "idx_narrative_totalDuration" ON "narrative" ("totalDurationSec");`
    );
    await connection.query(
      `CREATE INDEX IF NOT EXISTS "idx_narrative_fragment_composite" ON "narrative_fragment" ("narrativeId", "fragmentId", "sequence");`
    );
    await connection.query(
      `CREATE INDEX IF NOT EXISTS "idx_fragment_person" ON "fragment" ("personId", "title", "durationSec", "playerUrl", "thumbnailUrl");`
    );
    await connection.query(`CREATE INDEX IF NOT EXISTS "idx_person_country" ON "person" ("countryId", "name");`);

    console.log('Created optimized indexes');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

// Run comparison
async function comparePerformance() {
  try {
    // Connect to both databases
    await sqliteConnection.initialize();
    console.log('Connected to SQLite database');

    await neonConnection.initialize();
    console.log('Connected to Neon DB');

    // Run query against SQLite
    console.log('Running query against SQLite...');
    const sqliteResult = await runClientNarrativesQuery(sqliteConnection);
    console.log(
      `SQLite execution time: ${sqliteResult.executionTime.toFixed(2)}ms, results: ${sqliteResult.resultCount}`
    );

    // Create optimized indexes in Neon DB
    await createOptimizedIndexes(neonConnection);

    // Run query against Neon DB
    console.log('Running query against Neon DB...');
    const neonResult = await runClientNarrativesQuery(neonConnection);
    console.log(`Neon DB execution time: ${neonResult.executionTime.toFixed(2)}ms, results: ${neonResult.resultCount}`);

    // Calculate performance improvement
    const improvementFactor = sqliteResult.executionTime / neonResult.executionTime;
    console.log(`Performance improvement: ${improvementFactor.toFixed(2)}x faster with Neon DB`);

    // Get execution plan for PostgreSQL
    console.log('Execution plan for the query in Neon DB:');
    const explainResult = await neonConnection.query(`
      EXPLAIN ANALYZE
      SELECT 
        n.id as narrative_id, 
        n."totalDurationSec",
        nf.sequence,
        f.id as fragment_id,
        f.title as fragment_title,
        f."durationSec",
        f."playerUrl",
        f."thumbnailUrl",
        p.id as person_id,
        p.name as person_name,
        c.id as country_id,
        c.code as country_code
      FROM 
        narrative n
      LEFT JOIN 
        narrative_fragment nf ON n.id = nf."narrativeId"
      LEFT JOIN 
        fragment f ON nf."fragmentId" = f.id
      LEFT JOIN 
        person p ON f."personId" = p.id
      LEFT JOIN 
        country c ON p."countryId" = c.id
      ORDER BY 
        n.id, nf.sequence
    `);

    // Print execution plan
    explainResult.forEach((row: any) => {
      console.log(row);
    });
  } finally {
    // Close connections
    await sqliteConnection.destroy();
    await neonConnection.destroy();
  }
}

// Run the comparison
comparePerformance().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
