import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtendedIndexesForPerformance1741300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add compound index for narrative_fragment_entity that includes sequence
    // This will improve ordering by sequence which is used heavily in the getClientNarratives query
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_narrative_fragment_narrative_sequence" ON "narrative_fragment_entity" ("narrative_id", "sequence")`
    );

    // Add index on bio_entity to improve bios lookups
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bio_person_language" ON "bio_entity" ("person_id", "language_id")`
    );

    // Add index for country_id in country_names relationship
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_country_names" ON "name_entity" ("country_id") WHERE "country_id" IS NOT NULL`
    );

    // Add index for tag_id in name_entity table
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tag_names" ON "name_entity" ("tag_id") WHERE "tag_id" IS NOT NULL`
    );

    // Add index for fragment-tag relationships
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_fragment_tags_fragment" ON "fragment_tags" ("fragment_id")`
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_fragment_tags_tag" ON "fragment_tags" ("tag_id")`);

    // Add compound index for narrative fragments by both sequence and fragment_id
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_narrative_fragment_compound" ON "narrative_fragment_entity" ("narrative_id", "fragment_id", "sequence")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_narrative_fragment_compound"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fragment_tags_tag"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fragment_tags_fragment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tag_names"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_country_names"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bio_person_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_narrative_fragment_narrative_sequence"`);
  }
}
