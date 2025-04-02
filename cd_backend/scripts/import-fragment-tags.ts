import 'reflect-metadata';
import { DataSource } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { TagEntity } from '../src/db/entities/Tag';
import { NameEntity } from '../src/db/entities/Name';
import { FragmentEntity } from '../src/db/entities/Fragment';
import { LanguageEntity } from '../src/db/entities/Language';
import { createDbConnection } from '../src/db/db';

// Interface for the CSV data structure
interface FragmentTagsRow {
  id: string;
  'TAGS (comma separated)': string;
}

// Interface for tracking tags that couldn't be found
interface MissingTag {
  fragmentId: string;
  tagName: string;
}

// Initialize database connection
async function initializeConnection(): Promise<DataSource> {
  console.log('🔌 Initializing database connection...');
  const connection = await createDbConnection();
  console.log('✅ Database connection initialized');
  return connection;
}

// Close database connection
async function closeConnection(connection: DataSource) {
  console.log('🔌 Closing database connection...');
  if (connection && connection.isInitialized) {
    await connection.destroy();
    console.log('✅ Database connection closed');
  }
}

// Find a tag by its English name
async function findTagByEnglishName(connection: DataSource, tagName: string): Promise<TagEntity | null> {
  try {
    // Convert tag name to lowercase for case-insensitive matching
    const normalizedTagName = tagName.toLowerCase();

    // First get the English language entity
    const languageRepo = connection.getRepository(LanguageEntity);
    const englishLanguage = await languageRepo.findOne({
      where: { code: 'EN' },
    });

    if (!englishLanguage) {
      console.error('❌ English language not found in database');
      return null;
    }

    // Find name entity with this tag name and English language
    const nameRepo = connection.getRepository(NameEntity);
    const nameEntity = await nameRepo.findOne({
      where: {
        name: normalizedTagName,
        language: { id: englishLanguage.id },
      },
      relations: ['tag'],
    });

    if (!nameEntity || !nameEntity.tag) {
      return null;
    }

    return nameEntity.tag;
  } catch (error) {
    console.error(`Error finding tag "${tagName}":`, error);
    return null;
  }
}

// Process and import fragment-tag relationships from CSV
async function importFragmentTagsFromCsv(connection: DataSource) {
  console.log('\n📥 Importing fragment-tag relationships from CSV...');

  // Path to CSV file in the tags_migration folder
  const csvFilePath = path.join(process.cwd(), 'tags_migration', 'fragments_tags.csv');

  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found at ${csvFilePath}`);
  }

  console.log(`Reading CSV file from ${csvFilePath}`);

  // Read the CSV file
  const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });

  // Parse CSV content
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  }) as FragmentTagsRow[];

  console.log(`Found ${records.length} fragment entries to process`);

  // Track progress
  let processedFragments = 0;
  let skippedFragments = 0;
  let tagRelationsToCreate = 0;
  let missingTagsCount = 0;
  const missingTags = new Set<string>();
  const notFoundFragments = new Set<string>();

  // Create a single query runner for the entire process
  const queryRunner = connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Pre-fetch all fragment IDs that exist in the database for faster checking
    const allFragmentIds = new Set<string>();
    const fragmentsResult = await queryRunner.query('SELECT id FROM fragment');
    fragmentsResult.forEach((row: any) => allFragmentIds.add(row.id));

    // Batch inserts in groups for performance
    const batchSize = 100;
    let insertValues: string[] = [];
    let insertParams: any[] = [];
    let paramCount = 1;

    // Process each fragment row
    for (const record of records) {
      const fragmentId = record.id;
      const tagsList = record['TAGS (comma separated)'];

      // Skip if no fragment ID or tags
      if (!fragmentId || !tagsList) {
        skippedFragments++;
        continue;
      }

      // Check if fragment exists using our pre-fetched set
      if (!allFragmentIds.has(fragmentId)) {
        notFoundFragments.add(fragmentId);
        skippedFragments++;
        continue;
      }

      // Parse tags - split by comma and trim whitespace
      const tagNames = tagsList
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      // Process each tag for this fragment
      for (const tagName of tagNames) {
        // Find tag by English name (case-insensitive matching handled in findTagByEnglishName)
        const tag = await findTagByEnglishName(connection, tagName);

        if (!tag) {
          // Add to missing tags set
          missingTags.add(tagName);
          missingTagsCount++;
          continue;
        }

        // Add to the batch insert
        insertValues.push(`($${paramCount}, $${paramCount + 1})`);
        insertParams.push(fragmentId, tag.id);
        paramCount += 2;
        tagRelationsToCreate++;

        // Execute batch insert when we reach batch size
        if (insertValues.length >= batchSize) {
          if (insertValues.length > 0) {
            const query = `
              INSERT INTO fragment_tags (fragment_id, tag_id) 
              VALUES ${insertValues.join(', ')} 
              ON CONFLICT DO NOTHING
            `;
            await queryRunner.query(query, insertParams);

            // Reset batch
            insertValues = [];
            insertParams = [];
            paramCount = 1;
          }
        }
      }

      processedFragments++;

      // Log progress every 50 fragments
      if (processedFragments % 50 === 0) {
        console.log(`Processed ${processedFragments}/${records.length} fragments`);
      }
    }

    // Insert any remaining relations
    if (insertValues.length > 0) {
      const query = `
        INSERT INTO fragment_tags (fragment_id, tag_id) 
        VALUES ${insertValues.join(', ')} 
        ON CONFLICT DO NOTHING
      `;
      await queryRunner.query(query, insertParams);
    }

    // Commit the transaction
    await queryRunner.commitTransaction();

    // Log summary
    console.log('\n📊 Import summary:');
    console.log(`✅ Processed ${processedFragments} fragments`);
    console.log(`✅ Attempted to create ${tagRelationsToCreate} tag relationships (duplicates handled automatically)`);
    console.log(`⚠️ Skipped ${skippedFragments} fragments`);
    console.log(`⚠️ Found ${missingTagsCount} references to missing tags`);

    if (notFoundFragments.size > 0) {
      console.log(`\n⚠️ Could not find ${notFoundFragments.size} fragments`);
    }

    if (missingTags.size > 0) {
      console.log(`\n⚠️ Missing tags (${missingTags.size} unique tags):`);
      console.log(
        [...missingTags].slice(0, 10).join(', ') + (missingTags.size > 10 ? ` and ${missingTags.size - 10} more` : '')
      );
    }
  } catch (error) {
    // If an error occurred, rollback the transaction
    console.error('\n❌ Error during import:', error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // Release the query runner
    await queryRunner.release();
  }
}

// Main function
async function main() {
  console.log('🚀 Starting fragment-tag relationship import process');
  let connection: DataSource | null = null;

  try {
    // Initialize database connection
    connection = await initializeConnection();

    // Import fragment-tag relationships
    await importFragmentTagsFromCsv(connection);

    console.log('\n✅ Fragment-tag relationship import completed successfully');
  } catch (error: any) {
    console.error('\n❌ Fragment-tag import failed:', error.message || String(error));

    // Exit with non-zero status to indicate error
    process.exit(1);
  } finally {
    // Close connection
    if (connection) {
      await closeConnection(connection);
    }
  }
}

// Run the import
main().catch((error) => {
  console.error('Unhandled error during import:', error);
  process.exit(1);
});
