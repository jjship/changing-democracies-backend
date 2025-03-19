import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLanguageIndexes1710000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add composite index for narrative names by language for faster lookup of titles by language
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_name_language_name" ON "name" ("language_id", "name") WHERE "narrative_id" IS NOT NULL`
    );

    // Add index for descriptions by language for faster lookup
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_description_language" ON "description" ("language_id") WHERE "narrative_id" IS NOT NULL`
    );

    // Add index for narratives by creation date for efficient sorting
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_narrative_created_at" ON "narrative" ("created_at")`);

    // Add index on narrative id in the name table for faster joins
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_name_narrative" ON "name" ("narrative_id") WHERE "narrative_id" IS NOT NULL`
    );

    // Add index on narrative id in the description table for faster joins
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_description_narrative" ON "description" ("narrative_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_name_language_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_description_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_narrative_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_name_narrative"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_description_narrative"`);
  }
}
