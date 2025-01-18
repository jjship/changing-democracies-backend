import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create country_entity table
    await queryRunner.query(`
      CREATE TABLE "country_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "code" varchar(2) NOT NULL UNIQUE
      )
    `);

    // Create language_entity table
    await queryRunner.query(`
      CREATE TABLE "language_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" text NOT NULL UNIQUE,
        "code" varchar(2) NOT NULL UNIQUE
      )
    `);

    // Create person_entity table
    await queryRunner.query(`
      CREATE TABLE "person_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" text NOT NULL UNIQUE,
        "countryId" varchar,
        CONSTRAINT "FK_person_country" FOREIGN KEY ("countryId") REFERENCES "country_entity" ("id") ON DELETE RESTRICT
      )
    `);

    // Create bio_entity table
    await queryRunner.query(`
      CREATE TABLE "bio_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "bio" text NOT NULL,
        "personId" varchar,
        "languageId" varchar,
        CONSTRAINT "FK_bio_person" FOREIGN KEY ("personId") REFERENCES "person_entity" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bio_language" FOREIGN KEY ("languageId") REFERENCES "language_entity" ("id") ON DELETE RESTRICT
      )
    `);

    // Create tag_entity table
    await queryRunner.query(`
      CREATE TABLE "tag_entity" (
        "id" varchar PRIMARY KEY NOT NULL
      )
    `);

    // Create fragment_entity table with URLs
    await queryRunner.query(`
      CREATE TABLE "fragment_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "title" text NOT NULL,
        "durationSec" integer NOT NULL DEFAULT (0),
        "playerUrl" text NOT NULL,
        "thumbnailUrl" text NOT NULL,
        "personId" varchar,
        CONSTRAINT "FK_fragment_person" FOREIGN KEY ("personId") REFERENCES "person_entity" ("id") ON DELETE RESTRICT
      )
    `);

    // Create narrative_entity table
    await queryRunner.query(`
      CREATE TABLE "narrative_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "totalDurationSec" integer NOT NULL DEFAULT (0)
      )
    `);

    // Create name_entity table
    await queryRunner.query(`
      CREATE TABLE "name_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "type" text NOT NULL,
        "languageId" varchar,
        "countryId" varchar,
        "narrativeId" varchar,
        "tagId" varchar,
        CONSTRAINT "FK_name_language" FOREIGN KEY ("languageId") REFERENCES "language_entity" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_name_country" FOREIGN KEY ("countryId") REFERENCES "country_entity" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_name_narrative" FOREIGN KEY ("narrativeId") REFERENCES "narrative_entity" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_name_tag" FOREIGN KEY ("tagId") REFERENCES "tag_entity" ("id") ON DELETE CASCADE
      )
    `);

    // Create description_entity table
    await queryRunner.query(`
      CREATE TABLE "description_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "description" text NOT NULL,
        "narrativeId" varchar,
        "languageId" varchar,
        CONSTRAINT "FK_description_narrative" FOREIGN KEY ("narrativeId") REFERENCES "narrative_entity" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_description_language" FOREIGN KEY ("languageId") REFERENCES "language_entity" ("id") ON DELETE RESTRICT
      )
    `);

    // Create fragment_tags junction table
    await queryRunner.query(`
      CREATE TABLE "fragment_tags" (
        "fragment_id" varchar NOT NULL,
        "tag_id" varchar NOT NULL,
        PRIMARY KEY ("fragment_id", "tag_id"),
        CONSTRAINT "FK_fragment_tags_fragment" FOREIGN KEY ("fragment_id") REFERENCES "fragment_entity" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_fragment_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "tag_entity" ("id") ON DELETE CASCADE
      )
    `);

    // Create narrative_fragment_entity table
    await queryRunner.query(`
      CREATE TABLE "narrative_fragment_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "sequence" integer NOT NULL,
        "narrativeId" varchar NOT NULL,
        "fragmentId" varchar NOT NULL,
        CONSTRAINT "FK_narrative_fragment_narrative" FOREIGN KEY ("narrativeId") REFERENCES "narrative_entity" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_narrative_fragment_fragment" FOREIGN KEY ("fragmentId") REFERENCES "fragment_entity" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_narrative_sequence" UNIQUE ("narrativeId", "sequence")
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "idx_fragment_narrative" ON "narrative_fragment_entity" ("fragmentId", "narrativeId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_fragment_narrative"`);
    await queryRunner.query(`DROP TABLE "narrative_fragment_entity"`);
    await queryRunner.query(`DROP TABLE "fragment_tags"`);
    await queryRunner.query(`DROP TABLE "description_entity"`);
    await queryRunner.query(`DROP TABLE "name_entity"`);
    await queryRunner.query(`DROP TABLE "narrative_entity"`);
    await queryRunner.query(`DROP TABLE "fragment_entity"`);
    await queryRunner.query(`DROP TABLE "tag_entity"`);
    await queryRunner.query(`DROP TABLE "bio_entity"`);
    await queryRunner.query(`DROP TABLE "person_entity"`);
    await queryRunner.query(`DROP TABLE "language_entity"`);
    await queryRunner.query(`DROP TABLE "country_entity"`);
  }
}
