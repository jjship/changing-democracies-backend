# SQLite to Neon DB Migration Guide

This guide covers the process of migrating from SQLite to Neon DB for the Changing Democracies backend.

## Prerequisites

1. Sign up for a [Neon DB account](https://neon.tech)
2. Create a project and database
3. Note down the connection details (host, port, username, password, database name)

## Step 1: Install Required Dependencies

Run the provided npm script to install all necessary dependencies for the migration:

```bash
# Navigate to the backend directory
cd cd_backend

# Install migration dependencies
npm run install-migration-deps
```

This script installs the additional packages needed for migration without modifying package.json:

- `dotenv`: For loading environment variables
- `ts-node`: For running TypeScript scripts directly
- `@types/pg`: Type definitions for PostgreSQL

Note that most required dependencies like `pg`, `typeorm`, and `reflect-metadata` are already included in the backend's package.json.

## Step 2: Update Environment Variables

Add the Neon DB configuration to your `.env` file:

```
# Neon DB Configuration
NEON_DB_HOST=your-neon-db-hostname.neon.tech
NEON_DB_PORT=5432
NEON_DB_USERNAME=your-username
NEON_DB_PASSWORD=your-password
NEON_DB_DATABASE=your-database-name
NEON_DB_SSL=true

# During migration, set this to control which database is used
USE_NEON_DB=false
```

## Step 3: Test Connection to Neon DB

Run the following command to test the connection:

```bash
# Install pg client if not already installed
npm install pg

# Test connection
npx ts-node -e "
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

const connection = new DataSource({
  type: 'postgres',
  host: process.env.NEON_DB_HOST,
  port: parseInt(process.env.NEON_DB_PORT || '5432'),
  username: process.env.NEON_DB_USERNAME,
  password: process.env.NEON_DB_PASSWORD,
  database: process.env.NEON_DB_DATABASE,
  ssl: process.env.NEON_DB_SSL === 'true',
});

async function testConnection() {
  try {
    await connection.initialize();
    console.log('✅ Connected to Neon DB successfully!');
    await connection.destroy();
  } catch (error) {
    console.error('❌ Connection to Neon DB failed:', error);
  }
}

testConnection();
"
```

## Step 4: Prepare for Migration

Install necessary dependencies:

```bash
npm install pg reflect-metadata
```

## Step 5: Run Migration Script

Run the migration script from the backend directory:

```bash
# Make sure you're in the backend directory
cd cd_backend

# Run the migration script
npm run migrate-to-neon
```

This script will:

1. Connect to your SQLite database
2. Export all entities to JSON files
3. Connect to Neon DB
4. Create the schema in Neon DB
5. Import the data from JSON files
6. Run PostgreSQL-specific optimizations

## Step 6: Verify Data Migration

After running the migration script, verify that all data was migrated correctly:

```bash
npx ts-node -e "
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

// Import your entities
import { NarrativeEntity } from './cd_backend/src/db/entities/Narrative';
// Add other entities as needed

const connection = new DataSource({
  type: 'postgres',
  host: process.env.NEON_DB_HOST,
  port: parseInt(process.env.NEON_DB_PORT || '5432'),
  username: process.env.NEON_DB_USERNAME,
  password: process.env.NEON_DB_PASSWORD,
  database: process.env.NEON_DB_DATABASE,
  ssl: process.env.NEON_DB_SSL === 'true',
  entities: ['./cd_backend/src/db/entities/*.ts'],
});

async function verifyData() {
  try {
    await connection.initialize();

    // Check counts for key entities
    const narrativeCount = await connection.getRepository(NarrativeEntity).count();
    console.log(`Narratives: ${narrativeCount}`);

    // Add similar checks for other entities

    await connection.destroy();
  } catch (error) {
    console.error('Verification failed:', error);
  }
}

verifyData();
"
```

## Step 7: Switch to Neon DB

Once you've verified the data migration was successful:

1. Update the `.env` file to use Neon DB:

   ```
   USE_NEON_DB=true
   ```

2. Restart your application with the new configuration.

## Step 8: Performance Optimization

After migrating to Neon DB, consider these performance optimizations:

1. **Create indexes** for frequently queried columns (already included in the migration)
2. **Use connection pooling** to manage database connections efficiently
3. **Optimize queries** to take advantage of PostgreSQL's strengths
4. **Monitor query performance** using Neon DB's dashboard
5. **Consider increasing compute resources** if needed

## Handling Many-to-Many Relationships

The migration process includes special handling for many-to-many relationships, particularly:

1. **Fragment-Tag Relationships**: Since SQLite is more lenient with relationship constraints compared to PostgreSQL, the migration script takes a two-phase approach:
   - First phase: Import all entities without their relations
   - Second phase: Restore the relationships between entities

This approach prevents PostgreSQL foreign key constraint errors that could occur if you tried to import everything at once.

### How Relationship Migration Works

1. For fragments with tags, the tags array is temporarily removed during initial import
2. The fragment-tag relationship information is stored in a separate JSON file
3. After all entities are imported, the script reads this file and restores the relationships
4. This ensures all referenced entities exist before establishing relationships

### Troubleshooting Relationship Issues

If you encounter relationship-related errors after migration:

```bash
# Check for orphaned relationships
npx ts-node -e "
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

const connection = new DataSource({
  type: 'postgres',
  host: process.env.NEON_DB_HOST,
  port: parseInt(process.env.NEON_DB_PORT || '5432'),
  username: process.env.NEON_DB_USERNAME,
  password: process.env.NEON_DB_PASSWORD,
  database: process.env.NEON_DB_DATABASE,
  ssl: process.env.NEON_DB_SSL === 'true',
  entities: ['./cd_backend/src/db/entities/*.ts'],
});

async function checkRelationships() {
  try {
    await connection.initialize();
    console.log('Checking for orphaned relationships...');

    // Check narrative fragments without valid narrative or fragment
    const orphanedNarrativeFragments = await connection.query(`
      SELECT nf.id
      FROM narrative_fragment nf
      LEFT JOIN narrative n ON nf.\"narrativeId\" = n.id
      LEFT JOIN fragment f ON nf.\"fragmentId\" = f.id
      WHERE n.id IS NULL OR f.id IS NULL
    `);

    console.log(\`Found \${orphanedNarrativeFragments.length} orphaned narrative fragments\`);

    // Check other potential relationship issues
    // ...

    await connection.destroy();
  } catch (error) {
    console.error('Error checking relationships:', error);
  }
}

checkRelationships();
"
```

## PostgreSQL-Specific Index Optimizations

After migration, consider these PostgreSQL-specific index optimizations:

1. **Create indexes** for frequently queried columns
2. **Use connection pooling** to manage database connections efficiently
3. **Optimize queries** to take advantage of PostgreSQL's strengths
4. **Monitor query performance** using Neon DB's dashboard
5. **Consider increasing compute resources** if needed

## Optimizing the clientNarratives Query

The `clientNarratives.ctrl` query was identified as a bottleneck with SQLite. After migration to PostgreSQL, here are specific optimizations for this query:

### Adding Proper Indexes

The migration includes specialized indexes to optimize this specific query:

```sql
-- Indexes for the clientNarratives query
CREATE INDEX IF NOT EXISTS "idx_narrative_totalDuration" ON "narrative" ("totalDurationSec");
CREATE INDEX IF NOT EXISTS "idx_narrative_fragment_composite" ON "narrative_fragment" ("narrativeId", "fragmentId", "sequence");
CREATE INDEX IF NOT EXISTS "idx_fragment_person" ON "fragment" ("personId", "title", "durationSec", "playerUrl", "thumbnailUrl");
CREATE INDEX IF NOT EXISTS "idx_person_country" ON "person" ("countryId", "name");
```

These indexes are designed specifically to accelerate the complex joins in the clientNarratives query.

### Query Optimization

Consider refining the query itself to take advantage of PostgreSQL's strengths:

1. **Use CTEs (Common Table Expressions)** for complex subqueries:

```typescript
// Example optimized query using CTE
const narratives = await narrativeRepo.query(`
  WITH narrative_data AS (
    SELECT n.id, n."totalDurationSec", nf.sequence, f.id as fragment_id
    FROM narrative n
    LEFT JOIN narrative_fragment nf ON n.id = nf."narrativeId"
    LEFT JOIN fragment f ON nf."fragmentId" = f.id
    ORDER BY n.id, nf.sequence
  )
  SELECT * FROM narrative_data
`);
```

2. **Consider Materialized Views** for frequently accessed data:

```sql
-- Create a materialized view for client narratives
CREATE MATERIALIZED VIEW client_narratives_view AS
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
  n.id, nf.sequence;

-- Create index on the materialized view
CREATE INDEX idx_client_narratives_view_narrative_id ON client_narratives_view(narrative_id);

-- Refresh the view (run periodically)
REFRESH MATERIALIZED VIEW client_narratives_view;
```

3. **Implement Query Caching** at the database level in addition to your application-level caching:

```typescript
// Example of adding query caching hint
const result = await connection.query(`
  /*+ SET_CONFIG('statement_timeout', '5000', false) */
  SELECT /* CACHE_KEY: client_narratives */ ...
`);
```

### Performance Comparison Script

After migration, run the query performance comparison script from the backend directory:

```bash
# Make sure you're in the backend directory
cd cd_backend

# Run the performance comparison script
npm run compare-query-performance
```

This script will execute the same query against both SQLite and Neon DB, providing execution times and the PostgreSQL query plan for further optimization.

## Troubleshooting

If you encounter issues during migration:

1. **Connection failures**: Check network connectivity and firewall settings
2. **Data type errors**: PostgreSQL is more strict about data types than SQLite
3. **Primary key issues**: Make sure sequences are set correctly
4. **Missing dependencies**: Install any missing packages

## Rollback Plan

If you need to roll back to SQLite:

1. Set `USE_NEON_DB=false` in your `.env` file
2. Restart your application

## Performance Comparison

After migration, compare the performance of problematic queries:

```sql
-- Run this on Neon DB to see query performance
EXPLAIN ANALYZE SELECT * FROM narrative
LEFT JOIN narrative_fragment ON narrative.id = narrative_fragment.narrative_id
-- Add other joins as needed
```

Document the performance improvements for future reference.
