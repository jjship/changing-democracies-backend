import 'reflect-metadata';
import { DataSource, EntityMetadata } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { ENV } from '../src/env';
import { processNestedDateFields, convertDataTypesForPostgres } from './data-type-converter';
import { createDbConnection } from '../src/db/db';

// Import all entities
import { LanguageEntity } from '../src/db/entities/Language';
import { CountryEntity } from '../src/db/entities/Country';
import { PersonEntity } from '../src/db/entities/Person';
import { FragmentEntity } from '../src/db/entities/Fragment';
import { NarrativeEntity } from '../src/db/entities/Narrative';
import { NarrativeFragmentEntity } from '../src/db/entities/NarrativeFragment';
import { BioEntity } from '../src/db/entities/Bio';
import { DescriptionEntity } from '../src/db/entities/Description';
import { TagEntity } from '../src/db/entities/Tag';
import { NameEntity } from '../src/db/entities/Name';

// Define entity types to migrate and their dependencies
const entities = [
  {
    entity: LanguageEntity,
    name: 'languages',
    sqliteTable: 'language_entity',
    postgresTable: 'language',
    // Define SQLite column mappings for camelCase to snake_case conversion
    columnMappings: {
      id: 'id',
      name: 'name',
      code: 'code',
    },
    dependencies: [],
  },
  {
    entity: CountryEntity,
    name: 'countries',
    sqliteTable: 'country_entity',
    postgresTable: 'country',
    columnMappings: {
      id: 'id',
      code: 'code',
    },
    dependencies: [],
  },
  {
    entity: TagEntity,
    name: 'tags',
    sqliteTable: 'tag_entity',
    postgresTable: 'tag',
    columnMappings: {
      id: 'id',
    },
    dependencies: [],
  },
  {
    entity: PersonEntity,
    name: 'persons',
    sqliteTable: 'person_entity',
    postgresTable: 'person',
    columnMappings: {
      id: 'id',
      name: 'name',
      normalizedName: 'normalized_name',
      countryId: 'country_id',
    },
    dependencies: ['countries'],
  },
  {
    entity: NarrativeEntity,
    name: 'narratives',
    sqliteTable: 'narrative_entity',
    postgresTable: 'narrative',
    columnMappings: {
      id: 'id',
      totalDurationSec: 'total_duration_sec',
    },
    dependencies: [],
  },
  {
    entity: FragmentEntity,
    name: 'fragments',
    sqliteTable: 'fragment_entity',
    postgresTable: 'fragment',
    columnMappings: {
      id: 'id',
      title: 'title',
      durationSec: 'duration_sec',
      playerUrl: 'player_url',
      thumbnailUrl: 'thumbnail_url',
      personId: 'person_id',
    },
    dependencies: ['persons'],
  },
  {
    entity: BioEntity,
    name: 'bios',
    sqliteTable: 'bio_entity',
    postgresTable: 'bio',
    columnMappings: {
      id: 'id',
      bio: 'bio',
      personId: 'person_id',
      languageId: 'language_id',
    },
    dependencies: ['persons', 'languages'],
  },
  {
    entity: NameEntity,
    name: 'names',
    sqliteTable: 'name_entity',
    postgresTable: 'name',
    columnMappings: {
      id: 'id',
      name: 'name',
      type: 'type',
      languageId: 'language_id',
      countryId: 'country_id',
      narrativeId: 'narrative_id',
      tagId: 'tag_id',
    },
    dependencies: ['languages', 'countries', 'tags', 'narratives'],
  },
  {
    entity: DescriptionEntity,
    name: 'descriptions',
    sqliteTable: 'description_entity',
    postgresTable: 'description',
    columnMappings: {
      id: 'id',
      description: 'description',
      narrativeId: 'narrative_id',
      languageId: 'language_id',
    },
    dependencies: ['narratives', 'languages'],
  },
  {
    entity: NarrativeFragmentEntity,
    name: 'narrative_fragments',
    sqliteTable: 'narrative_fragment_entity',
    postgresTable: 'narrative_fragment',
    columnMappings: {
      id: 'id',
      sequence: 'sequence',
      narrativeId: 'narrative_id',
      fragmentId: 'fragment_id',
    },
    dependencies: ['narratives', 'fragments'],
  },
];

// Create SQLite connection
let sqliteConnection: DataSource;
let neonConnection: DataSource;

// Directory to store temporary JSON files
const exportDir = path.join(process.cwd(), 'migration_export');

// Improved type definitions for our data structures
interface ColumnMapping {
  [camelCaseKey: string]: string | undefined; // Allow undefined values
}

interface EntityDefinition {
  entity: any;
  name: string;
  sqliteTable: string;
  postgresTable: string;
  columnMappings: ColumnMapping; // Use ColumnMapping with updated definition
  dependencies: string[];
}

interface TableSchema {
  exists: boolean;
  columns: string[];
  missingColumns?: string[];
  valid?: boolean;
}

interface FragmentTagRelation {
  fragment_id: string;
  tag_id: string;
}

interface MigrationError extends Error {
  phase: 'init' | 'export' | 'import' | 'check';
  entityName?: string;
  details?: any;
}

// Initialize database connections
async function initializeConnections() {
  console.log('🔌 Initializing database connections...');

  // Create SQLite connection
  sqliteConnection = await createDbConnection({
    type: 'sqlite',
    database: path.join(process.cwd(), 'data', ENV.DB_DATABASE),
    entities: [`${__dirname}/../src/db/entities/*.{js,ts}`],
    synchronize: false,
    logging: ['error'],
  });
  console.log('✅ SQLite connection initialized');

  // Create Neon DB connection
  neonConnection = await createDbConnection({
    name: 'neon', // Use a different name to avoid conflicts
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
}

// Close all database connections
async function closeConnections() {
  console.log('🔌 Closing database connections...');

  if (sqliteConnection && sqliteConnection.isInitialized) {
    await sqliteConnection.destroy();
    console.log('✅ SQLite connection closed');
  }

  if (neonConnection && neonConnection.isInitialized) {
    await neonConnection.destroy();
    console.log('✅ PostgreSQL connection closed');
  }
}

// Create a safer error function for better error handling
function createMigrationError(
  message: string,
  phase: MigrationError['phase'],
  entityName?: string,
  details?: any
): MigrationError {
  const error = new Error(message) as MigrationError;
  error.phase = phase;
  error.entityName = entityName;
  error.details = details;
  return error;
}

// Add a generic error handling wrapper for async functions
async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  phase: MigrationError['phase'],
  entityName?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    throw createMigrationError(`${errorMessage}: ${error.message || String(error)}`, phase, entityName, error);
  }
}

// Add function to check table schemas and validate column names
async function checkTableSchema(tableName: string, expectedColumns: string[]): Promise<TableSchema> {
  try {
    // Get the pragma table_info for the SQLite table
    const tableInfo = await sqliteConnection.query(`PRAGMA table_info("${tableName}")`);

    if (!tableInfo || tableInfo.length === 0) {
      return { exists: false, columns: [] };
    }

    // Extract column names
    const columns = tableInfo.map((col: any) => col.name);

    // Validate that all expected columns exist
    const missingColumns = expectedColumns.filter((col) => !columns.includes(col));

    return {
      exists: true,
      columns,
      missingColumns,
      valid: missingColumns.length === 0,
    };
  } catch (error) {
    console.error(`Error checking schema for table ${tableName}:`, error);
    return { exists: false, columns: [], missingColumns: expectedColumns, valid: false };
  }
}

/**
 * Dynamically reads the SQLite schema and enhances our column mappings
 * to include any camelCase columns that might be missing in our static definitions
 */
async function enhanceColumnMappingsFromSchema(): Promise<void> {
  console.log('🔍 Analyzing SQLite schema to enhance column mappings...');

  // Process each entity definition
  for (const entityDef of entities) {
    try {
      // Get actual table name in SQLite
      const actualTableName = await findTableNameInSQLite(entityDef.entity.name, entityDef.sqliteTable);

      if (!actualTableName) {
        console.warn(`⚠️ Could not find table for ${entityDef.name} in SQLite database, skipping schema analysis`);
        continue;
      }

      // Get column info from SQLite
      const tableInfo = await sqliteConnection.query(`PRAGMA table_info("${actualTableName}")`);

      if (!tableInfo || tableInfo.length === 0) {
        console.warn(`⚠️ No columns found for table ${actualTableName}`);
        continue;
      }

      // Extract column names
      const actualColumns = tableInfo.map((col: any) => col.name);
      console.log(`Found ${actualColumns.length} columns in ${actualTableName}: ${actualColumns.join(', ')}`);

      // Check for camelCase columns not in our mappings
      const mappedColumns = Object.keys(entityDef.columnMappings);
      const unmappedColumns = actualColumns.filter((col: string) => !mappedColumns.includes(col));

      if (unmappedColumns.length > 0) {
        console.log(
          `Found ${unmappedColumns.length} unmapped columns in ${actualTableName}: ${unmappedColumns.join(', ')}`
        );

        // Add these columns to our mappings using camelToSnake conversion
        for (const camelCol of unmappedColumns) {
          // Skip columns that are already in snake_case
          if (camelCol.includes('_')) continue;

          // Convert camelCase to snake_case
          const snakeCol = camelCol.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();

          // Add to mappings if it's different
          if (camelCol !== snakeCol) {
            console.log(`Adding mapping: ${camelCol} -> ${snakeCol}`);
            // Use unknown as intermediate type for safer type conversion
            (entityDef.columnMappings as unknown as Record<string, string>)[camelCol] = snakeCol;
          }
        }
      }
    } catch (error: any) {
      console.warn(`⚠️ Error analyzing schema for ${entityDef.name}:`, error.message || String(error));
    }
  }

  console.log('✅ Schema analysis complete');
}

// Enhanced pre-check function to detect and warn about potential issues
async function checkForDataTypeIssues() {
  console.log('🔍 Checking for potential data compatibility issues...');

  const dateColumnTypes = ['datetime', 'timestamp', 'date'];
  const problematicFields: string[] = [];
  const tableSchemaIssues: Record<string, any> = {};

  // Check each entity for potentially problematic fields
  for (const { entity, name, sqliteTable, columnMappings } of entities) {
    try {
      // Check for SQLite table existence and schema
      if (columnMappings) {
        const expectedColumns = Object.keys(columnMappings);
        const schemaCheck = await checkTableSchema(sqliteTable, expectedColumns);

        if (!schemaCheck.exists) {
          tableSchemaIssues[sqliteTable] = {
            error: 'Table not found in SQLite database',
            expectedColumns,
          };
          console.warn(`⚠️ Table "${sqliteTable}" not found in SQLite database`);
          continue;
        }

        if (!schemaCheck.valid && schemaCheck.missingColumns && schemaCheck.missingColumns.length > 0) {
          tableSchemaIssues[sqliteTable] = {
            error: 'Missing columns in SQLite table',
            missingColumns: schemaCheck.missingColumns,
            existingColumns: schemaCheck.columns,
          };
          console.warn(`⚠️ Table "${sqliteTable}" is missing columns: ${schemaCheck.missingColumns.join(', ')}`);
        }
      }

      // Check for problematic data types
      const metadata = sqliteConnection.getMetadata(entity);
      for (const column of metadata.columns) {
        // Check for date/time columns
        const columnType = column.type.toString().toLowerCase();
        if (dateColumnTypes.some((type) => columnType.includes(type))) {
          problematicFields.push(`${metadata.name}.${column.propertyName} (${column.type})`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not get metadata for ${name}, skipping checks`);
    }
  }

  // Report findings
  if (Object.keys(tableSchemaIssues).length > 0) {
    console.warn('\n⚠️ Schema issues detected in SQLite database:');
    for (const [table, issue] of Object.entries(tableSchemaIssues)) {
      console.warn(`  - ${table}: ${issue.error}`);
      if (issue.missingColumns && issue.missingColumns.length > 0) {
        console.warn(`    Missing columns: ${issue.missingColumns.join(', ')}`);
      }
    }
    console.warn('\nThese issues might cause data migration failures for some entities.\n');
  }

  if (problematicFields.length > 0) {
    console.warn('\n⚠️ Potentially problematic fields detected:');
    problematicFields.forEach((field) => console.warn(`  - ${field}`));
    console.warn('These fields will be excluded from the migration.\n');
  }

  if (Object.keys(tableSchemaIssues).length === 0 && problematicFields.length === 0) {
    console.log('✅ No potential data type or schema issues detected');
  }
}

// Function to try alternative table names
async function findTableNameInSQLite(entityName: string, sqliteTableName: string): Promise<string | null> {
  const possibleTableNames = [
    sqliteTableName, // Standard name from entity definition
    entityName.toLowerCase(), // Lowercase entity name
    entityName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(), // snake_case derived from entity name
    entityName.toLowerCase() + '_entity', // Append _entity
  ];

  for (const tableName of possibleTableNames) {
    try {
      // Check if table exists
      const result = await sqliteConnection.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
      );
      if (result && result.length > 0) {
        return tableName;
      }
    } catch (error) {
      // Ignore errors and try next name
    }
  }

  return null;
}

// Add a helper function for SQL escaping
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

async function exportFromSqlite() {
  console.log('\n📤 Starting export from SQLite...');

  // Ensure export directory exists
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  try {
    // Export each entity
    for (const { entity, name, sqliteTable, columnMappings } of entities) {
      console.log(`📌 Exporting ${name}...`);
      try {
        // Find actual table name in SQLite
        const actualTableName = await withErrorHandling(
          () => findTableNameInSQLite(entity.name, sqliteTable),
          `Could not find table for ${name}`,
          'export',
          name
        );

        if (!actualTableName) {
          console.error(`❌ Could not find table for ${name} in SQLite database`);
          console.log(`Creating empty JSON file for ${name}`);
          fs.writeFileSync(path.join(exportDir, `${name}.json`), JSON.stringify([], null, 2));
          continue;
        }

        // If table exists but with a different name, log it
        if (actualTableName !== sqliteTable) {
          console.log(`📝 Found table as "${actualTableName}" instead of "${sqliteTable}"`);
        }

        // Build a SQL query with the correct camelCase column names
        if (!columnMappings) {
          throw createMigrationError(`No column mappings defined for ${name}`, 'export', name);
        }

        const columns = Object.keys(columnMappings)
          .map((col) => `"${col}"`)
          .join(', ');

        console.log(`Exporting columns: ${Object.keys(columnMappings).join(', ')}`);

        const query = `SELECT ${columns} FROM "${actualTableName}"`;

        try {
          // Execute the query
          const data = await withErrorHandling(
            () => sqliteConnection.query(query),
            `Failed to execute query for ${name}`,
            'export',
            name
          );

          if (data && data.length > 0) {
            console.log(`✅ Retrieved ${data.length} records from ${actualTableName}`);

            // Convert camelCase keys to snake_case based on columnMappings
            const convertedData = data.map((item: Record<string, any>) => {
              const converted: Record<string, any> = {};
              for (const [camelKey, snakeKey] of Object.entries(columnMappings)) {
                if (item[camelKey] !== undefined) {
                  converted[snakeKey] = item[camelKey];
                }
              }
              return converted;
            });

            // Apply data type conversions
            const transformedData = processNestedDateFields(convertDataTypesForPostgres(convertedData));

            // Save to JSON file
            const filePath = path.join(exportDir, `${name}.json`);
            fs.writeFileSync(filePath, JSON.stringify(transformedData, null, 2));
            console.log(`💾 Exported ${transformedData.length} records to ${filePath}`);
          } else {
            console.log(`ℹ️ No data found for ${name}, creating empty JSON file`);
            fs.writeFileSync(path.join(exportDir, `${name}.json`), JSON.stringify([], null, 2));
          }
        } catch (error: any) {
          console.error(`❌ Error with SQL query for ${actualTableName}:`, error.message || String(error));
          console.log(`Creating empty JSON file for ${name}`);
          fs.writeFileSync(path.join(exportDir, `${name}.json`), JSON.stringify([], null, 2));
        }
      } catch (error: any) {
        console.error(`❌ Error exporting ${name}:`, error.message || String(error));
        // Continue with next entity even if one fails
        console.log(`Creating empty JSON file for ${name}`);
        fs.writeFileSync(path.join(exportDir, `${name}.json`), JSON.stringify([], null, 2));
      }
    }

    // Handle fragment tags relationship separately
    try {
      console.log('📌 Exporting fragment_tags relationship...');
      // Try both camelCase and snake_case column names
      let data: any[] = [];
      try {
        data = await sqliteConnection.query(
          `SELECT "fragmentId" as fragment_id, "tagId" as tag_id FROM "fragment_tags"`
        );
      } catch (error) {
        console.log('Trying alternative column names for fragment_tags...');
        try {
          data = await sqliteConnection.query(`SELECT "fragment_id", "tag_id" FROM "fragment_tags"`);
        } catch (innerError) {
          console.error('Could not query fragment_tags with either naming convention');
        }
      }

      if (data && data.length > 0) {
        // Organize by fragment ID
        const fragmentTagMap: Record<string, string[]> = {};

        for (const relation of data) {
          const fragmentId = relation.fragment_id;
          const tagId = relation.tag_id;

          if (!fragmentId || !tagId) {
            console.warn('Found relation with missing IDs:', relation);
            continue;
          }

          if (!fragmentTagMap[fragmentId]) {
            fragmentTagMap[fragmentId] = [];
          }

          fragmentTagMap[fragmentId].push(tagId);
        }

        // Save relationships as JSONL for processing during import
        const filePath = path.join(exportDir, 'fragment_tags_relations.jsonl');
        const fileStream = fs.createWriteStream(filePath);

        for (const [fragmentId, tagIds] of Object.entries(fragmentTagMap)) {
          fileStream.write(JSON.stringify({ fragment_id: fragmentId, tag_ids: tagIds }) + '\n');
        }

        fileStream.end();
        console.log(`💾 Exported ${data.length} fragment-tag relationships`);
      } else {
        console.log('ℹ️ No fragment-tag relationships found');
      }
    } catch (error: any) {
      console.error('❌ Error exporting fragment-tag relationships:', error.message || String(error));
    }

    console.log('✅ Export from SQLite completed successfully');
  } catch (error: any) {
    console.error('❌ Error during export:', error.message || String(error));
    if ((error as MigrationError).details) {
      console.error('Details:', (error as MigrationError).details);
    }
    throw error;
  }
}

async function schemaAlreadyExists(connection: DataSource): Promise<boolean> {
  try {
    // Check if any of our key tables exist
    const result = await connection.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'country'
      )
    `);

    return result[0]?.exists === true || result[0]?.exists === 't';
  } catch (error) {
    console.error('❌ Error checking if schema exists:', error);
    return false;
  }
}

async function fixNarrativeFragmentRelations() {
  console.log('🔧 Checking narrative fragment relationships for completeness...');

  const nfFilePath = path.join(exportDir, 'narrative_fragments.json');
  if (!fs.existsSync(nfFilePath)) {
    console.warn('⚠️ No narrative_fragments.json file found, skipping relation fix');
    return;
  }

  try {
    // Read the narrative fragments
    let narrativeFragments = JSON.parse(fs.readFileSync(nfFilePath, 'utf8'));

    if (!narrativeFragments || !narrativeFragments.length) {
      console.log('ℹ️ No narrative fragments to fix');
      return;
    }

    console.log(`Found ${narrativeFragments.length} narrative fragment relations to check`);

    // First, check for null or missing relation IDs
    const nonNullFragments = narrativeFragments.filter((nf: { narrative_id?: string; fragment_id?: string }) => {
      const isValid = nf.narrative_id && nf.fragment_id;
      if (!isValid) {
        console.warn(
          `⚠️ Found invalid narrative fragment relation: missing ${!nf.narrative_id ? 'narrative_id' : 'fragment_id'}`
        );
      }
      return isValid;
    });

    // Now, load all fragments to check for valid fragment_ids
    console.log('Checking that all fragment_ids exist in fragments table...');
    const fragmentsFilePath = path.join(exportDir, 'fragments.json');

    if (!fs.existsSync(fragmentsFilePath)) {
      console.warn('⚠️ No fragments.json file found, cannot validate fragment references');
      return nonNullFragments;
    }

    // Read all fragment IDs into a Set for fast lookup
    const fragmentsData = JSON.parse(fs.readFileSync(fragmentsFilePath, 'utf8'));
    const validFragmentIds = new Set<string>();

    for (const fragment of fragmentsData) {
      if (fragment.id) {
        validFragmentIds.add(fragment.id);
      }
    }

    console.log(`Found ${validFragmentIds.size} valid fragment IDs`);

    // Filter narrative fragments to only include those with valid fragment_ids
    const validFragments = nonNullFragments.filter((nf: { fragment_id: string }) => {
      const isFragmentValid = validFragmentIds.has(nf.fragment_id);
      if (!isFragmentValid) {
        console.warn(`⚠️ Found narrative fragment with non-existent fragment_id: ${nf.fragment_id}`);
      }
      return isFragmentValid;
    });

    // Also check for valid narrative IDs
    console.log('Checking that all narrative_ids exist in narratives table...');
    const narrativesFilePath = path.join(exportDir, 'narratives.json');

    if (fs.existsSync(narrativesFilePath)) {
      const narrativesData = JSON.parse(fs.readFileSync(narrativesFilePath, 'utf8'));
      const validNarrativeIds = new Set<string>();

      for (const narrative of narrativesData) {
        if (narrative.id) {
          validNarrativeIds.add(narrative.id);
        }
      }

      console.log(`Found ${validNarrativeIds.size} valid narrative IDs`);

      // Further filter to ensure valid narrative IDs
      const fullyValidFragments = validFragments.filter((nf: { narrative_id: string }) => {
        const isNarrativeValid = validNarrativeIds.has(nf.narrative_id);
        if (!isNarrativeValid) {
          console.warn(`⚠️ Found narrative fragment with non-existent narrative_id: ${nf.narrative_id}`);
        }
        return isNarrativeValid;
      });

      // If we removed any invalid relations, write back the filtered data
      if (fullyValidFragments.length !== narrativeFragments.length) {
        console.log(`Removing ${narrativeFragments.length - fullyValidFragments.length} invalid relations`);
        fs.writeFileSync(nfFilePath, JSON.stringify(fullyValidFragments, null, 2));
        console.log('✅ Updated narrative_fragments.json with valid relations only');
      } else {
        console.log('✅ All narrative fragment relations are valid');
      }

      return fullyValidFragments;
    } else {
      // If narratives file doesn't exist, just use the fragment-validated data
      if (validFragments.length !== narrativeFragments.length) {
        console.log(`Removing ${narrativeFragments.length - validFragments.length} invalid relations`);
        fs.writeFileSync(nfFilePath, JSON.stringify(validFragments, null, 2));
        console.log('✅ Updated narrative_fragments.json with valid relations only');
      } else {
        console.log('✅ All narrative fragment relations have valid fragment_ids');
      }

      return validFragments;
    }
  } catch (error: any) {
    console.error('❌ Error fixing narrative fragments:', error.message || String(error));
    return null;
  }
}

/**
 * Import a single entity from the exported JSON to PostgreSQL
 * Checks dependencies and handles errors gracefully
 *
 * @param entityName Name of the entity to import
 * @param importedEntities Set of successfully imported entities for dependency tracking
 * @returns Promise that resolves when the entity is imported
 */
async function importEntity(entityName: string, importedEntities: Set<string>): Promise<boolean> {
  // Find the entity definition
  const entityDef = entities.find((e) => e.name === entityName);
  if (!entityDef) {
    console.error(`❌ Entity definition not found for ${entityName}`);
    return false;
  }

  // Skip if already imported
  if (importedEntities.has(entityName)) {
    console.log(`✅ Entity ${entityName} already imported, skipping`);
    return true;
  }

  // Check dependencies
  const missingDependencies = entityDef.dependencies.filter((dep) => !importedEntities.has(dep));
  if (missingDependencies.length > 0) {
    console.log(`⏳ Entity ${entityName} is missing dependencies: ${missingDependencies.join(', ')}`);
    return false;
  }

  console.log(`📥 Importing ${entityName}...`);

  try {
    // Read the exported JSON file
    const filePath = path.join(exportDir, `${entityName}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ No export file found for ${entityName}, skipping`);
      return false;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`ℹ️ No data to import for ${entityName}, marking as imported`);
      importedEntities.add(entityName);
      return true;
    }

    // Get the table name in PostgreSQL
    const tableName = entityDef.postgresTable;

    // Begin a transaction
    await neonConnection.query('BEGIN');

    try {
      console.log(`Importing ${data.length} records to ${tableName}...`);

      // Process records in batches to avoid overwhelming the database
      const BATCH_SIZE = 100;
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);

        for (const record of batch) {
          const columns = Object.keys(record).filter((col) => record[col] !== undefined);

          // Skip empty records
          if (columns.length === 0) continue;

          const values = columns.map((col) => {
            const value = record[col];
            return escapeSQLValue(value);
          });

          // Construct the INSERT query
          const query = `
            INSERT INTO "${tableName}" (${columns.map((col) => `"${col}"`).join(', ')})
            VALUES (${values.join(', ')})
            ON CONFLICT (id) DO UPDATE SET 
            ${columns.map((col) => `"${col}" = ${escapeSQLValue(record[col])}`).join(', ')}
          `;

          try {
            await neonConnection.query(query);
          } catch (error: any) {
            console.error(`❌ Error importing record to ${tableName}:`, error.message || String(error));
            console.error('Query:', query);
            console.error('Record:', JSON.stringify(record, null, 2));
            throw error;
          }
        }

        console.log(
          `✅ Imported batch ${Math.min(i + BATCH_SIZE, data.length)}/${data.length} records to ${tableName}`
        );
      }

      // Special handling for fragment_tags relationship
      if (entityName === 'fragments') {
        await importFragmentTagRelations();
      }

      // Commit the transaction
      await neonConnection.query('COMMIT');

      console.log(`✅ Successfully imported ${data.length} records to ${tableName}`);
      importedEntities.add(entityName);
      return true;
    } catch (error: any) {
      // Rollback on error
      await neonConnection.query('ROLLBACK');
      console.error(`❌ Error importing ${entityName}, rolling back:`, error.message || String(error));
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Error reading or parsing data for ${entityName}:`, error.message || String(error));
    return false;
  }
}

/**
 * Import fragment-tag relationships
 */
async function importFragmentTagRelations(): Promise<void> {
  const relationsPath = path.join(exportDir, 'fragment_tags_relations.jsonl');
  if (!fs.existsSync(relationsPath)) {
    console.log('ℹ️ No fragment-tag relations file found, skipping');
    return;
  }

  console.log('📥 Importing fragment-tag relationships...');

  try {
    // Read the JSONL file line by line
    const fileContent = fs.readFileSync(relationsPath, 'utf8');
    const lines = fileContent.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      console.log('ℹ️ No fragment-tag relationships to import');
      return;
    }

    console.log(`Found ${lines.length} fragment-tag relationship entries`);

    // Process in batches
    let importedCount = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);

      for (const line of batch) {
        try {
          const relation = JSON.parse(line);
          const fragmentId = relation.fragment_id;
          const tagIds = relation.tag_ids;

          if (!fragmentId || !tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
            console.warn('⚠️ Invalid fragment-tag relation format:', line);
            continue;
          }

          // Insert each tag relationship
          for (const tagId of tagIds) {
            // Check if the fragment_id and tag_id exist in their respective tables
            const fragmentExists = await checkFragmentExists(fragmentId);
            const tagExists = await checkTagExists(tagId);

            if (!fragmentExists) {
              console.warn(`⚠️ Skipping fragment-tag relation: Fragment ID ${fragmentId} does not exist`);
              continue;
            }

            if (!tagExists) {
              console.warn(`⚠️ Skipping fragment-tag relation: Tag ID ${tagId} does not exist`);
              continue;
            }

            // Use the correct table name and column names from the schema
            const query = `
              INSERT INTO "fragment_tags" ("fragment_id", "tag_id")
              VALUES (${escapeSQLValue(fragmentId)}, ${escapeSQLValue(tagId)})
              ON CONFLICT ("fragment_id", "tag_id") DO NOTHING
            `;

            await neonConnection.query(query);
            importedCount++;
          }
        } catch (error: any) {
          console.error('❌ Error importing fragment-tag relation:', error.message || String(error));
          console.error('Line:', line);
        }
      }

      console.log(`✅ Processed batch of fragment-tag relationships (${i + batch.length}/${lines.length})`);
    }

    console.log(`✅ Imported ${importedCount} fragment-tag relationships`);
  } catch (error: any) {
    console.error('❌ Error importing fragment-tag relationships:', error.message || String(error));
  }
}

// Helper function to check if a fragment exists
async function checkFragmentExists(fragmentId: string): Promise<boolean> {
  try {
    const result = await neonConnection.query('SELECT 1 FROM "fragment" WHERE "id" = $1 LIMIT 1', [fragmentId]);
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking if fragment ${fragmentId} exists:`, error);
    return false;
  }
}

// Helper function to check if a tag exists
async function checkTagExists(tagId: string): Promise<boolean> {
  try {
    const result = await neonConnection.query('SELECT 1 FROM "tag" WHERE "id" = $1 LIMIT 1', [tagId]);
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking if tag ${tagId} exists:`, error);
    return false;
  }
}

async function importToNeon() {
  console.log('\n📥 Starting import to PostgreSQL...');

  try {
    // Check if schema already exists
    const schemaExists = await schemaAlreadyExists(neonConnection);

    if (schemaExists) {
      console.log('✓ PostgreSQL schema already exists, proceeding with data import');
    } else {
      console.error('❌ PostgreSQL schema does not exist. Please run migrations first to create the schema.');
      console.error('   Run: npm run typeorm migration:run');
      throw new Error('Schema not found. Run migrations first');
    }

    // Handle dependencies by properly sorting entities
    // This is important because PostgreSQL enforces foreign key constraints
    const orderedImports = [
      'languages', // No dependencies
      'countries', // No dependencies
      'tags', // No dependencies
      'narratives', // No dependencies
      'persons', // Depends on countries
      'fragments', // Depends on persons
      'names', // Depends on languages, countries, tags, narratives
      'bios', // Depends on persons, languages
      'descriptions', // Depends on narratives, languages
      'narrative_fragments', // Depends on narratives, fragments
    ];

    // Track successfully imported entities for dependency tracking
    const importedEntities = new Set<string>();
    // Track failed entities for retry
    const failedEntities = new Map<string, number>(); // entity name -> retry count

    // First import pass - try to import everything in order
    console.log('🔄 First import pass - importing entities in dependency order...');
    for (const entityName of orderedImports) {
      await importEntity(entityName, importedEntities);
    }

    // Retry failed entities until all are imported or max retries reached
    const MAX_RETRIES = 3;
    let retryCount = 0;
    while (importedEntities.size < orderedImports.length && retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`\n🔄 Retry pass ${retryCount} - retrying failed entities...`);

      // Find entities not yet imported
      const pendingEntities = orderedImports.filter((entity) => !importedEntities.has(entity));

      // Try to import each pending entity
      let madeProgress = false;
      for (const entityName of pendingEntities) {
        const success = await importEntity(entityName, importedEntities);
        if (success) {
          madeProgress = true;
        } else {
          failedEntities.set(entityName, (failedEntities.get(entityName) || 0) + 1);
        }
      }

      // If no progress was made in this pass, break early
      if (!madeProgress) {
        console.log('⚠️ No progress made in this retry pass, breaking early');
        break;
      }
    }

    // Report final status
    console.log('\n📊 Import status summary:');
    console.log(`✅ Successfully imported ${importedEntities.size}/${orderedImports.length} entities`);

    if (importedEntities.size < orderedImports.length) {
      const stillPending = orderedImports.filter((entity) => !importedEntities.has(entity));
      console.log(`❌ Failed to import ${stillPending.length} entities: ${stillPending.join(', ')}`);

      // Show detailed status for failed entities
      for (const entityName of stillPending) {
        const retryCount = failedEntities.get(entityName) || 0;
        const entityDef = entities.find((e) => e.name === entityName);
        if (entityDef) {
          const missingDeps = entityDef.dependencies.filter((dep) => !importedEntities.has(dep));
          if (missingDeps.length > 0) {
            console.log(`  - ${entityName}: Missing dependencies: ${missingDeps.join(', ')}`);
          } else {
            console.log(`  - ${entityName}: Failed after ${retryCount} attempts`);
          }
        }
      }
    }

    console.log('\n✅ Import to PostgreSQL completed');
  } catch (error: any) {
    console.error('❌ Error during import:', error.message || String(error));
    if ((error as MigrationError).details) {
      console.error('Details:', (error as MigrationError).details);
    }
    throw error;
  }
}

/**
 * Main function to run the migration
 */
async function main() {
  console.log('🚀 Starting SQLite to PostgreSQL migration');

  try {
    // Initialize database connections
    await initializeConnections();

    // First, enhance column mappings from schema
    await enhanceColumnMappingsFromSchema();

    // Check for potential data type issues
    await checkForDataTypeIssues();

    // Export data from SQLite
    await exportFromSqlite();

    // Fix narrative fragment relationships if needed
    await fixNarrativeFragmentRelations();

    // Import data to PostgreSQL
    await importToNeon();

    console.log('✅ Migration completed successfully');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message || String(error));
    if ((error as MigrationError).details) {
      console.error('Details:', (error as MigrationError).details);
    }
    process.exit(1);
  } finally {
    // Always close connections when done
    await closeConnections();
  }
}

// Run the migration
main().catch((error) => {
  console.error('Unhandled error during migration:', error);
  process.exit(1);
});
