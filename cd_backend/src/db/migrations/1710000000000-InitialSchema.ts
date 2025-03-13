import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create country table
    await queryRunner.query(`
      CREATE TABLE "country" (
        "id" varchar PRIMARY KEY NOT NULL,
        "code" varchar(2) NOT NULL UNIQUE
      )
    `);

    // Create language table
    await queryRunner.query(`
      CREATE TABLE "language" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" text NOT NULL UNIQUE,
        "code" varchar(2) NOT NULL UNIQUE
      )
    `);

    // Create person table with normalized_name
    // (includes changes from AddNormalizedNameToPerson)
    await queryRunner.query(`
      CREATE TABLE "person" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" text NOT NULL UNIQUE,
        "normalized_name" varchar NOT NULL UNIQUE,
        "country_id" varchar,
        CONSTRAINT "FK_person_country" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE RESTRICT
      )
    `);

    // Create bio table
    await queryRunner.query(`
      CREATE TABLE "bio" (
        "id" varchar PRIMARY KEY NOT NULL,
        "bio" text NOT NULL,
        "person_id" varchar,
        "language_id" varchar,
        CONSTRAINT "FK_bio_person" FOREIGN KEY ("person_id") REFERENCES "person" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bio_language" FOREIGN KEY ("language_id") REFERENCES "language" ("id") ON DELETE RESTRICT
      )
    `);

    // Create tag table
    await queryRunner.query(`
      CREATE TABLE "tag" (
        "id" varchar PRIMARY KEY NOT NULL
      )
    `);

    // Create fragment table with URLs
    // (includes changes from MakePersonNonNullableInFragment)
    await queryRunner.query(`
      CREATE TABLE "fragment" (
        "id" varchar PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "duration_sec" integer NOT NULL DEFAULT (0),
        "player_url" text NOT NULL,
        "thumbnail_url" text NOT NULL,
        "person_id" varchar NULL,
        CONSTRAINT "FK_fragment_person" FOREIGN KEY ("person_id") REFERENCES "person" ("id") ON DELETE RESTRICT
      )
    `);

    // Create narrative table
    await queryRunner.query(`
      CREATE TABLE "narrative" (
        "id" varchar PRIMARY KEY NOT NULL,
        "total_duration_sec" integer NOT NULL DEFAULT (0)
      )
    `);

    // Create name table
    await queryRunner.query(`
      CREATE TABLE "name" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "type" text NOT NULL,
        "language_id" varchar,
        "country_id" varchar,
        "narrative_id" varchar,
        "tag_id" varchar,
        CONSTRAINT "FK_name_language" FOREIGN KEY ("language_id") REFERENCES "language" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_name_country" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_name_narrative" FOREIGN KEY ("narrative_id") REFERENCES "narrative" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_name_tag" FOREIGN KEY ("tag_id") REFERENCES "tag" ("id") ON DELETE CASCADE
      )
    `);

    // Create description table
    await queryRunner.query(`
      CREATE TABLE "description" (
        "id" varchar PRIMARY KEY NOT NULL,
        "description" text NOT NULL,
        "narrative_id" varchar,
        "language_id" varchar,
        CONSTRAINT "FK_description_narrative" FOREIGN KEY ("narrative_id") REFERENCES "narrative" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_description_language" FOREIGN KEY ("language_id") REFERENCES "language" ("id") ON DELETE RESTRICT
      )
    `);

    // Create fragment_tags junction table
    await queryRunner.query(`
      CREATE TABLE "fragment_tags" (
        "fragment_id" varchar NOT NULL,
        "tag_id" varchar NOT NULL,
        PRIMARY KEY ("fragment_id", "tag_id"),
        CONSTRAINT "FK_fragment_tags_fragment" FOREIGN KEY ("fragment_id") REFERENCES "fragment" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_fragment_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "tag" ("id") ON DELETE CASCADE
      )
    `);

    // Create narrative_fragment table
    await queryRunner.query(`
      CREATE TABLE "narrative_fragment" (
        "id" varchar PRIMARY KEY NOT NULL,
        "sequence" integer NOT NULL,
        "narrative_id" varchar NOT NULL,
        "fragment_id" varchar NOT NULL,
        CONSTRAINT "FK_narrative_fragment_narrative" FOREIGN KEY ("narrative_id") REFERENCES "narrative" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_narrative_fragment_fragment" FOREIGN KEY ("fragment_id") REFERENCES "fragment" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_narrative_sequence" UNIQUE ("narrative_id", "sequence")
      )
    `);

    // Create indexes (includes all indexes from AddIndexesForPerformance and AddExtendedIndexesForPerformance)

    // Basic indexes
    await queryRunner.query(
      `CREATE INDEX "idx_fragment_narrative" ON "narrative_fragment" ("fragment_id", "narrative_id")`
    );

    // Language indexes
    await queryRunner.query(`CREATE INDEX "idx_language_code" ON "language" ("code")`);

    // Description and name indexes
    await queryRunner.query(
      `CREATE INDEX "idx_description_narrative_language" ON "description" ("narrative_id", "language_id")`
    );
    await queryRunner.query(`CREATE INDEX "idx_name_narrative_language" ON "name" ("narrative_id", "language_id")`);

    // Narrative fragment indexes
    await queryRunner.query(`CREATE INDEX "idx_narrative_fragment_narrative" ON "narrative_fragment" ("narrative_id")`);
    await queryRunner.query(`CREATE INDEX "idx_narrative_fragment_fragment" ON "narrative_fragment" ("fragment_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_narrative_fragment_narrative_sequence" ON "narrative_fragment" ("narrative_id", "sequence")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_narrative_fragment_compound" ON "narrative_fragment" ("narrative_id", "fragment_id", "sequence")`
    );

    // Fragment and person indexes
    await queryRunner.query(`CREATE INDEX "idx_fragment_person" ON "fragment" ("person_id")`);
    await queryRunner.query(`CREATE INDEX "idx_person_country" ON "person" ("country_id")`);
    await queryRunner.query(`CREATE INDEX "idx_fragment_person_country" ON "fragment" ("person_id")`);

    // Bio indexes
    await queryRunner.query(`CREATE INDEX "idx_bio_person_language" ON "bio" ("person_id", "language_id")`);

    // Name entity indexes
    await queryRunner.query(`CREATE INDEX "idx_country_names" ON "name" ("country_id") WHERE "country_id" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "idx_tag_names" ON "name" ("tag_id") WHERE "tag_id" IS NOT NULL`);

    // Fragment-tag indexes
    await queryRunner.query(`CREATE INDEX "idx_fragment_tags_fragment" ON "fragment_tags" ("fragment_id")`);
    await queryRunner.query(`CREATE INDEX "idx_fragment_tags_tag" ON "fragment_tags" ("tag_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fragment_tags_tag"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fragment_tags_fragment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tag_names"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_country_names"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bio_person_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fragment_person_country"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_person_country"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fragment_person"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_narrative_fragment_compound"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_narrative_fragment_narrative_sequence"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_narrative_fragment_fragment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_narrative_fragment_narrative"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_name_narrative_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_description_narrative_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_language_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fragment_narrative"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "narrative_fragment"`);
    await queryRunner.query(`DROP TABLE "fragment_tags"`);
    await queryRunner.query(`DROP TABLE "description"`);
    await queryRunner.query(`DROP TABLE "name"`);
    await queryRunner.query(`DROP TABLE "narrative"`);
    await queryRunner.query(`DROP TABLE "fragment"`);
    await queryRunner.query(`DROP TABLE "tag"`);
    await queryRunner.query(`DROP TABLE "bio"`);
    await queryRunner.query(`DROP TABLE "person"`);
    await queryRunner.query(`DROP TABLE "language"`);
    await queryRunner.query(`DROP TABLE "country"`);
  }
}
