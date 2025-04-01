import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFragmentClientEndpointIndexes1742326990000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add index on fragment title for efficient sorting
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_fragment_title" ON "fragment" ("title")`);

    // Add index for name value to speed up text searches
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_name_value" ON "name" ("name")`);

    // Add specialized index for tag names by language for filtered lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_name_tag_language" ON "name" ("tag_id", "language_id") WHERE "tag_id" IS NOT NULL`
    );

    // Add specialized index for country names by language for filtered lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_name_country_language" ON "name" ("country_id", "language_id") WHERE "country_id" IS NOT NULL`
    );

    // Add index on bios with language filtering
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bio_language" ON "bio" ("language_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fragment_title"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_name_value"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_name_tag_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_name_country_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bio_language"`);
  }
}
