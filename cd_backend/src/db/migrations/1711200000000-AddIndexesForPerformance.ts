import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesForPerformance1711200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Indexes for language access
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_language_code" ON "language_entity" ("code")`);

    // Indexes for narratives, descriptions, and names join performance
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_description_narrative_language" ON "description_entity" ("narrative_id", "language_id")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_name_narrative_language" ON "name_entity" ("narrative_id", "language_id")`
    );

    // Indexes for narrative fragments
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_narrative_fragment_narrative" ON "narrative_fragment_entity" ("narrative_id")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_narrative_fragment_fragment" ON "narrative_fragment_entity" ("fragment_id")`
    );

    // Index for fragment person and person country lookups
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_fragment_person" ON "fragment_entity" ("person_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_person_country" ON "person_entity" ("country_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_person_country"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fragment_person"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_narrative_fragment_fragment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_narrative_fragment_narrative"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_name_narrative_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_description_narrative_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_language_code"`);
  }
}
