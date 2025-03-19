import 'reflect-metadata';
import { DataSource } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { ENV } from '../src/env';
import { processNestedDateFields, convertDataTypesForPostgres } from './data-type-converter';
import { createDbConnection } from '../src/db/db';
import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

// Import relevant entities
import { LanguageEntity } from '../src/db/entities/Language';
import { NarrativeEntity } from '../src/db/entities/Narrative';
import { DescriptionEntity } from '../src/db/entities/Description';
import { NameEntity } from '../src/db/entities/Name';

// Directory for intermediate output
const exportDir = path.join(process.cwd(), 'migration_export_narratives');

// Database connections
let sqliteDb: Database;
let neonConnection: DataSource;

/**
 * Initialize database connections
 */
async function initializeConnections() {
  console.log('🔌 Initializing database connections...');

  try {
    // Open SQLite connection using sqlite package (bypassing TypeORM entirely for SQLite)
    sqliteDb = await open({
      filename: path.join(process.cwd(), 'data', ENV.DB_DATABASE),
      driver: sqlite3.Database,
    });
    console.log('✅ SQLite connection initialized (direct mode)');

    // Create Neon DB connection using TypeORM
    neonConnection = await createDbConnection({
      name: 'neon',
      type: 'postgres',
      host: ENV.NEON_DB_HOST,
      port: parseInt(ENV.NEON_DB_PORT || '5432'),
      username: ENV.NEON_DB_USERNAME,
      password: ENV.NEON_DB_PASSWORD,
      database: ENV.NEON_DB_DATABASE,
      ssl: ENV.NEON_DB_SSL,
      entities: [`${__dirname}/../src/db/entities/*.{js,ts}`],
      synchronize: false,
      logging: ['error'],
    });
    console.log('✅ PostgreSQL connection initialized');
  } catch (error: any) {
    console.error(`Failed to initialize database connections: ${error.message}`);
    throw error;
  }
}

/**
 * Close all database connections
 */
async function closeConnections() {
  console.log('🔌 Closing database connections...');

  if (sqliteDb) {
    await sqliteDb.close();
    console.log('✅ SQLite connection closed');
  }

  if (neonConnection && neonConnection.isInitialized) {
    await neonConnection.destroy();
    console.log('✅ PostgreSQL connection closed');
  }
}

/**
 * Try various possible table names to find the actual table in SQLite
 */
async function findTableNameInSQLite(tableName: string, alternativeNames: string[] = []): Promise<string | null> {
  const possibleTableNames = [
    tableName,
    ...alternativeNames,
    tableName.toLowerCase(),
    tableName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(),
    tableName.toLowerCase() + '_entity',
    tableName.toLowerCase() + 's',
  ];

  for (const name of possibleTableNames) {
    try {
      // Check if table exists using direct SQL query
      const result = await sqliteDb.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [name]);
      if (result && result.name) {
        console.log(`Found table '${name}'`);
        return name;
      }
    } catch (error) {
      // Ignore errors and try next name
    }
  }

  console.warn(`Could not find any matching table. Tried: ${possibleTableNames.join(', ')}`);
  return null;
}

/**
 * Get actual column names from a table
 */
async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const tableInfo = await sqliteDb.all(`PRAGMA table_info("${tableName}")`);
    return tableInfo.map((col: any) => col.name);
  } catch (error) {
    console.error(`Error getting column info for ${tableName}:`, error);
    return [];
  }
}

/**
 * Helper function for SQL escaping
 */
function escapeSQLValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'string') {
    // Replace single quotes with two single quotes to escape them in SQL
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }

  // Default to string representation with escaping
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Export data from SQLite
 */
async function exportNarrativeTranslations() {
  console.log('📤 Exporting narrative translations from SQLite...');

  // Ensure export directory exists
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  // Define the entities we're interested in
  const entityConfigs = [
    {
      name: 'names',
      tableName: 'name_entity',
      alternativeNames: ['name', 'names', 'name_entities'],
      targetTable: 'name',
      columnMappings: {
        // Try both camelCase and snake_case
        id: 'id',
        name: 'name',
        type: 'type',
        languageId: 'language_id',
        language_id: 'language_id',
        narrativeId: 'narrative_id',
        narrative_id: 'narrative_id',
      },
    },
    {
      name: 'descriptions',
      tableName: 'description_entity',
      alternativeNames: ['description', 'descriptions', 'description_entities'],
      targetTable: 'description',
      columnMappings: {
        id: 'id',
        description: 'description',
        languageId: 'language_id',
        language_id: 'language_id',
        narrativeId: 'narrative_id',
        narrative_id: 'narrative_id',
      },
    },
  ];

  // Process each entity
  for (const config of entityConfigs) {
    console.log(`📌 Exporting ${config.name}...`);

    // Find the actual table name
    const actualTableName = await findTableNameInSQLite(config.tableName, config.alternativeNames);
    if (!actualTableName) {
      console.error(`❌ Could not find table for ${config.name}`);
      continue;
    }

    // Get the actual columns in the table
    const actualColumns = await getTableColumns(actualTableName);
    console.log(`Table ${actualTableName} has columns: ${actualColumns.join(', ')}`);

    // Find which columns from our mapping exist in the table
    const existingColumns = Object.keys(config.columnMappings).filter((col) => actualColumns.includes(col));
    if (existingColumns.length === 0) {
      console.error(`❌ No matching columns found for ${config.name}`);
      continue;
    }

    // Build and execute query with parameterized SQL to prevent SQL injection
    const columnsForQuery = existingColumns.map((col) => `"${col}"`).join(', ');
    const query = `SELECT ${columnsForQuery} FROM "${actualTableName}"`;

    try {
      // Execute query using the direct SQLite connection
      const data = await sqliteDb.all(query);
      console.log(`Retrieved ${data.length} records from ${actualTableName}`);

      if (data && data.length > 0) {
        // Convert column names based on mapping
        const convertedData = data.map((item: Record<string, any>) => {
          const converted: Record<string, any> = {};
          for (const [sourceCol, targetCol] of Object.entries(config.columnMappings)) {
            if (item[sourceCol] !== undefined) {
              converted[targetCol] = item[sourceCol];
            }
          }
          return converted;
        });

        // Apply data type conversions
        const transformedData = processNestedDateFields(convertDataTypesForPostgres(convertedData));

        // Save to file
        const filePath = path.join(exportDir, `${config.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(transformedData, null, 2));
        console.log(`💾 Exported ${transformedData.length} records to ${filePath}`);
      } else {
        console.log(`ℹ️ No data found for ${config.name}`);
      }
    } catch (error: any) {
      console.error(`❌ Error exporting ${config.name}:`, error.message);
    }
  }

  console.log('✅ Export completed');
}

/**
 * Check if a narrative exists in the PostgreSQL database
 */
async function checkNarrativeExists(narrativeId: string): Promise<boolean> {
  try {
    const result = await neonConnection.query('SELECT 1 FROM "narrative" WHERE "id" = $1 LIMIT 1', [narrativeId]);
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking if narrative ${narrativeId} exists:`, error);
    return false;
  }
}

/**
 * Check if a language exists in the PostgreSQL database
 */
async function checkLanguageExists(languageId: string): Promise<boolean> {
  try {
    const result = await neonConnection.query('SELECT 1 FROM "language" WHERE "id" = $1 LIMIT 1', [languageId]);
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking if language ${languageId} exists:`, error);
    return false;
  }
}

/**
 * Check if a specific name record already exists
 */
async function checkNameExists(narrativeId: string, languageId: string, type: string): Promise<boolean> {
  try {
    const result = await neonConnection.query(
      'SELECT 1 FROM "name" WHERE "narrative_id" = $1 AND "language_id" = $2 AND "type" = $3 LIMIT 1',
      [narrativeId, languageId, type]
    );
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking if name record exists:`, error);
    return false;
  }
}

/**
 * Check if a specific description record already exists
 */
async function checkDescriptionExists(narrativeId: string, languageId: string): Promise<boolean> {
  try {
    const result = await neonConnection.query(
      'SELECT 1 FROM "description" WHERE "narrative_id" = $1 AND "language_id" = $2 LIMIT 1',
      [narrativeId, languageId]
    );
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking if description record exists:`, error);
    return false;
  }
}

/**
 * Import names and descriptions to PostgreSQL
 */
async function importNarrativeTranslations() {
  console.log('📥 Importing narrative translations to PostgreSQL...');

  // Import names first
  const namesFilePath = path.join(exportDir, 'names.json');
  if (fs.existsSync(namesFilePath)) {
    try {
      const names = JSON.parse(fs.readFileSync(namesFilePath, 'utf8'));
      console.log(`Found ${names.length} name records to import`);

      // Filter to only narrative-related names
      const narrativeNames = names.filter((name: any) => name.narrative_id);
      console.log(`${narrativeNames.length} records are narrative-related`);

      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      // Process in smaller batches
      const BATCH_SIZE = 50;
      for (let i = 0; i < narrativeNames.length; i += BATCH_SIZE) {
        const batch = narrativeNames.slice(i, i + BATCH_SIZE);

        await neonConnection.query('BEGIN');

        for (const nameRecord of batch) {
          try {
            // Verify that narrative and language exist
            const narrativeExists = await checkNarrativeExists(nameRecord.narrative_id);
            const languageExists = nameRecord.language_id ? await checkLanguageExists(nameRecord.language_id) : false;

            if (!narrativeExists) {
              console.warn(`⚠️ Skipping name: Narrative ${nameRecord.narrative_id} does not exist`);
              skippedCount++;
              continue;
            }

            if (!languageExists) {
              console.warn(`⚠️ Skipping name: Language ${nameRecord.language_id} does not exist`);
              skippedCount++;
              continue;
            }

            // Check if this name already exists
            const exists = await checkNameExists(nameRecord.narrative_id, nameRecord.language_id, nameRecord.type);

            if (exists) {
              console.log(
                `ℹ️ Name already exists for narrative ${nameRecord.narrative_id} in language ${nameRecord.language_id}`
              );
              skippedCount++;
              continue;
            }

            // Build column list excluding undefined values
            const columns = Object.keys(nameRecord).filter((key) => nameRecord[key] !== undefined);
            const values = columns.map((col) => escapeSQLValue(nameRecord[col]));

            // Construct and execute INSERT query
            const query = `
              INSERT INTO "name" (${columns.map((col) => `"${col}"`).join(', ')})
              VALUES (${values.join(', ')})
              ON CONFLICT (id) DO NOTHING
            `;

            await neonConnection.query(query);
            importedCount++;
          } catch (error: any) {
            console.error(`❌ Error importing name: ${error.message}`);
            console.error('Record:', JSON.stringify(nameRecord, null, 2));
            errorCount++;
          }
        }

        await neonConnection.query('COMMIT');
        console.log(`Processed batch ${Math.min(i + BATCH_SIZE, narrativeNames.length)}/${narrativeNames.length}`);
      }

      console.log(`✅ Imported ${importedCount} names, skipped ${skippedCount}, errors: ${errorCount}`);
    } catch (error: any) {
      console.error(`❌ Error processing names: ${error.message}`);
    }
  } else {
    console.log('ℹ️ No names file found');
  }

  // Import descriptions
  const descriptionsFilePath = path.join(exportDir, 'descriptions.json');
  if (fs.existsSync(descriptionsFilePath)) {
    try {
      const descriptions = JSON.parse(fs.readFileSync(descriptionsFilePath, 'utf8'));
      console.log(`Found ${descriptions.length} description records to import`);

      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      // Process in smaller batches
      const BATCH_SIZE = 50;
      for (let i = 0; i < descriptions.length; i += BATCH_SIZE) {
        const batch = descriptions.slice(i, i + BATCH_SIZE);

        await neonConnection.query('BEGIN');

        for (const descRecord of batch) {
          try {
            // Verify that narrative and language exist
            const narrativeExists = await checkNarrativeExists(descRecord.narrative_id);
            const languageExists = descRecord.language_id ? await checkLanguageExists(descRecord.language_id) : false;

            if (!narrativeExists) {
              console.warn(`⚠️ Skipping description: Narrative ${descRecord.narrative_id} does not exist`);
              skippedCount++;
              continue;
            }

            if (!languageExists) {
              console.warn(`⚠️ Skipping description: Language ${descRecord.language_id} does not exist`);
              skippedCount++;
              continue;
            }

            // Check if this description already exists
            const exists = await checkDescriptionExists(descRecord.narrative_id, descRecord.language_id);

            if (exists) {
              console.log(
                `ℹ️ Description already exists for narrative ${descRecord.narrative_id} in language ${descRecord.language_id}`
              );
              skippedCount++;
              continue;
            }

            // Build column list excluding undefined values
            const columns = Object.keys(descRecord).filter((key) => descRecord[key] !== undefined);
            const values = columns.map((col) => escapeSQLValue(descRecord[col]));

            // Construct and execute INSERT query
            const query = `
              INSERT INTO "description" (${columns.map((col) => `"${col}"`).join(', ')})
              VALUES (${values.join(', ')})
              ON CONFLICT (id) DO NOTHING
            `;

            await neonConnection.query(query);
            importedCount++;
          } catch (error: any) {
            console.error(`❌ Error importing description: ${error.message}`);
            console.error('Record:', JSON.stringify(descRecord, null, 2));
            errorCount++;
          }
        }

        await neonConnection.query('COMMIT');
        console.log(`Processed batch ${Math.min(i + BATCH_SIZE, descriptions.length)}/${descriptions.length}`);
      }

      console.log(`✅ Imported ${importedCount} descriptions, skipped ${skippedCount}, errors: ${errorCount}`);
    } catch (error: any) {
      console.error(`❌ Error processing descriptions: ${error.message}`);
    }
  } else {
    console.log('ℹ️ No descriptions file found');
  }

  console.log('✅ Import completed');
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting narrative translations migration');

  try {
    // Initialize connections
    await initializeConnections();

    // Export translations data from SQLite
    await exportNarrativeTranslations();

    // Import translations to PostgreSQL
    await importNarrativeTranslations();

    console.log('✅ Migration of narrative translations completed successfully');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    // Close connections
    await closeConnections();
  }
}

// Run the migration
main().catch((error) => {
  console.error('Unhandled error during migration:', error);
  process.exit(1);
});
