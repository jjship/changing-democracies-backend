import { MigrationInterface, QueryRunner } from 'typeorm';
import { ENV } from '../../env';

export class AddUrlsToFragments1710315882000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create a new table with the desired structure
    await queryRunner.query(`
      CREATE TABLE "temporary_fragment_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "title" text NOT NULL,
        "personId" varchar,
        "durationSec" integer NOT NULL DEFAULT (0),
        "playerUrl" text NOT NULL,
        "thumbnailUrl" text NOT NULL,
        CONSTRAINT "FK_46decde910efee31d4879d062fc" FOREIGN KEY ("personId") REFERENCES "person_entity" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    // Copy data from the old table to the new one, generating URLs for each record
    const fragments = await queryRunner.query(`SELECT * FROM "fragment_entity"`);
    for (const fragment of fragments) {
      const playerUrl = `https://iframe.mediadelivery.net/embed/${ENV.BUNNY_STREAM_LIBRARY_ID}/${fragment.id}`;
      const thumbnailUrl = `https://${ENV.BUNNY_STREAM_PULL_ZONE}.b-cdn.net/${fragment.id}/thumbnail.jpg`;
      await queryRunner.query(
        `INSERT INTO "temporary_fragment_entity" ("id", "createdAt", "updatedAt", "title", "personId", "durationSec", "playerUrl", "thumbnailUrl")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          fragment.id,
          fragment.createdAt,
          fragment.updatedAt,
          fragment.title,
          fragment.personId,
          fragment.durationSec || 0,
          playerUrl,
          thumbnailUrl,
        ]
      );
    }

    // Drop the old table and rename the new one
    await queryRunner.query(`DROP TABLE "fragment_entity"`);
    await queryRunner.query(`ALTER TABLE "temporary_fragment_entity" RENAME TO "fragment_entity"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Create a new table without the URL columns
    await queryRunner.query(`
      CREATE TABLE "temporary_fragment_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "title" text NOT NULL,
        "personId" varchar,
        "durationSec" integer NOT NULL DEFAULT (0),
        CONSTRAINT "FK_46decde910efee31d4879d062fc" FOREIGN KEY ("personId") REFERENCES "person_entity" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);

    // Copy data back, excluding the URL columns
    await queryRunner.query(`
      INSERT INTO "temporary_fragment_entity" ("id", "createdAt", "updatedAt", "title", "personId", "durationSec")
      SELECT "id", "createdAt", "updatedAt", "title", "personId", "durationSec"
      FROM "fragment_entity"
    `);

    // Drop the old table and rename the new one
    await queryRunner.query(`DROP TABLE "fragment_entity"`);
    await queryRunner.query(`ALTER TABLE "temporary_fragment_entity" RENAME TO "fragment_entity"`);
  }
}
