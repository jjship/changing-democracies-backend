import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTagCategory1742326991000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tag_category table
    await queryRunner.query(`
      CREATE TABLE "tag_category" (
        "id" varchar PRIMARY KEY NOT NULL
      )
    `);

    // Create tag_category_tags junction table for many-to-many relationship
    await queryRunner.query(`
      CREATE TABLE "tag_category_tags" (
        "tag_category_id" varchar NOT NULL,
        "tag_id" varchar NOT NULL,
        PRIMARY KEY ("tag_category_id", "tag_id"),
        CONSTRAINT "FK_tag_category_tags_category" FOREIGN KEY ("tag_category_id") REFERENCES "tag_category" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tag_category_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "tag" ("id") ON DELETE CASCADE
      )
    `);

    // Add tag_category_id to name table for multilingual names
    await queryRunner.query(`
      ALTER TABLE "name" 
      ADD COLUMN "tag_category_id" varchar,
      ADD CONSTRAINT "FK_name_tag_category" FOREIGN KEY ("tag_category_id") REFERENCES "tag_category" ("id") ON DELETE CASCADE
    `);

    // Create indexes for better performance
    await queryRunner.query(`CREATE INDEX "idx_tag_category_tags_category" ON "tag_category_tags" ("tag_category_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tag_category_tags_tag" ON "tag_category_tags" ("tag_id")`);
    await queryRunner.query(
      `CREATE INDEX "idx_name_tag_category_language" ON "name" ("tag_category_id", "language_id") WHERE "tag_category_id" IS NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_name_tag_category_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tag_category_tags_tag"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tag_category_tags_category"`);

    // Drop foreign key constraint from name table
    await queryRunner.query(`
      ALTER TABLE "name" 
      DROP CONSTRAINT "FK_name_tag_category",
      DROP COLUMN "tag_category_id"
    `);

    // Drop junction table
    await queryRunner.query(`DROP TABLE "tag_category_tags"`);

    // Drop tag_category table
    await queryRunner.query(`DROP TABLE "tag_category"`);
  }
}
