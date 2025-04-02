import 'reflect-metadata';
import { DataSource } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ENV } from '../src/env';
import { TagEntity } from '../src/db/entities/Tag';
import { NameEntity } from '../src/db/entities/Name';
import { LanguageEntity } from '../src/db/entities/Language';
import { createDbConnection } from '../src/db/db';

// Required languages for tag import with correct ISO codes
const requiredLanguages = [
  { name: 'English', code: 'EN' },
  { name: 'Catalan', code: 'CA' },
  { name: 'Croatian', code: 'HR' },
  { name: 'Czech', code: 'CS' },
  { name: 'Dutch', code: 'NL' },
  { name: 'Greek', code: 'EL' },
  { name: 'Lithuanian', code: 'LT' },
  { name: 'Polish', code: 'PL' },
  { name: 'Portuguese', code: 'PT' },
  { name: 'Romanian', code: 'RO' },
  { name: 'Spanish', code: 'ES' },
];

// Map of language headers in CSV to language codes for lookups
const languageHeaderToCode: Record<string, string> = {
  English: 'EN',
  Catalan: 'CA',
  Croatian: 'HR',
  Czech: 'CS',
  Dutch: 'NL',
  Greek: 'EL',
  Lithuanian: 'LT',
  Polish: 'PL',
  Portuguese: 'PT',
  Romanian: 'RO',
  Spanish: 'ES',
};

// Initialize database connection
async function initializeConnection(): Promise<DataSource> {
  console.log('🔌 Initializing database connection...');

  // Create connection
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

// Check and create required languages if they don't exist
async function checkAndCreateLanguages(connection: DataSource): Promise<Map<string, LanguageEntity>> {
  console.log('🔍 Checking for required languages...');

  const languageRepository = connection.getRepository(LanguageEntity);

  // Get existing languages
  const existingLanguages = await languageRepository.find();
  const existingLanguageCodes = new Map<string, LanguageEntity>();

  // Create a map of existing languages by code (case insensitive)
  for (const language of existingLanguages) {
    existingLanguageCodes.set(language.code.toUpperCase(), language);
  }

  console.log('Existing languages:', Array.from(existingLanguageCodes.keys()).join(', '));

  // Check which languages are missing
  const missingLanguages = requiredLanguages.filter((lang) => !existingLanguageCodes.has(lang.code.toUpperCase()));

  if (missingLanguages.length === 0) {
    console.log('✅ All required languages already exist in the database.');
  } else {
    console.log(`Found ${missingLanguages.length} missing languages. Creating them now...`);

    // Create missing languages
    for (const langInfo of missingLanguages) {
      const language = new LanguageEntity();
      language.name = langInfo.name;
      language.code = langInfo.code;

      await languageRepository.save(language);
      console.log(`Created language: ${langInfo.name} (${langInfo.code})`);

      // Add to the map
      existingLanguageCodes.set(language.code.toUpperCase(), language);
    }

    console.log('✅ All required languages are now in the database.');
  }

  return existingLanguageCodes;
}

// Process and import tags from CSV
async function importTagsFromCsv(connection: DataSource, languageMap: Map<string, LanguageEntity>) {
  console.log('\n📥 Importing tags from CSV...');

  // Path to CSV file (in the tags_migration folder)
  const csvFilePath = path.join(process.cwd(), 'tags_migration', 'tags_import.csv');

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
  });

  console.log(`Found ${records.length} tags to import`);

  // Get repositories
  const tagRepository = connection.getRepository(TagEntity);
  const nameRepository = connection.getRepository(NameEntity);

  // Start a transaction
  const queryRunner = connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Track progress
    let importedTags = 0;
    let skippedTags = 0;
    let totalNames = 0;

    // Process each tag (row in CSV)
    for (const record of records) {
      // Skip empty rows or rows without English name
      if (!record['English'] || record['English'].trim() === '') {
        skippedTags++;
        continue;
      }

      // Create new tag
      const tag = new TagEntity();
      await queryRunner.manager.save(tag);

      console.log(`Created tag with ID: ${tag.id}`);

      // Create names for each language
      const names: NameEntity[] = [];

      // Process each language column
      for (const [langHeader, langCode] of Object.entries(languageHeaderToCode)) {
        const tagName = record[langHeader];

        if (tagName && tagName.trim() !== '') {
          // Find the language entity
          const language = languageMap.get(langCode.toUpperCase());

          if (!language) {
            console.warn(`⚠️ Could not find language for code ${langCode}, skipping translation`);
            continue;
          }

          // Create name entity - store tag names in lowercase
          const name = new NameEntity();
          // Convert to lowercase before saving to ensure case-insensitive matching
          name.name = tagName.trim().toLowerCase();
          name.type = 'primary';
          name.language = language;
          name.tag = tag;

          names.push(name);
        }
      }

      // Save names if any were created
      if (names.length > 0) {
        await queryRunner.manager.save(names);
        console.log(`Added ${names.length} translations for tag ${tag.id}`);
        totalNames += names.length;
        importedTags++;
      } else {
        // If no translations were created, remove the tag
        await queryRunner.manager.remove(tag);
        console.warn(`⚠️ No valid translations found for tag, removing empty tag`);
        skippedTags++;
      }
    }

    // Commit the transaction
    await queryRunner.commitTransaction();

    console.log('\n📊 Import summary:');
    console.log(`✅ Successfully imported ${importedTags} tags with ${totalNames} translations`);
    console.log(`⚠️ Skipped ${skippedTags} tags`);
  } catch (error) {
    // Rollback the transaction on error
    console.error('❌ Error during import, rolling back:', error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // Release the query runner
    await queryRunner.release();
  }
}

// Main function
async function main() {
  console.log('🚀 Starting tag import process');
  let connection: DataSource | null = null;

  try {
    // Initialize database connection
    connection = await initializeConnection();

    // Check and create languages
    const languageMap = await checkAndCreateLanguages(connection);

    // Import tags
    await importTagsFromCsv(connection, languageMap);

    console.log('\n✅ Tag import completed successfully');
  } catch (error: any) {
    console.error('\n❌ Tag import failed:', error.message || String(error));
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
