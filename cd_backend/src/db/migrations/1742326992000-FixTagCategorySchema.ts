import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTagCategorySchema1742326992000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if tag_category table exists, if not create it
    const tagCategoryExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tag_category'
      )
    `);

    if (!tagCategoryExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "tag_category" (
          "id" varchar PRIMARY KEY NOT NULL
        )
      `);
    }

    // Check if tag_category_tags table exists, if not create it
    const tagCategoryTagsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tag_category_tags'
      )
    `);

    if (!tagCategoryTagsExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "tag_category_tags" (
          "tag_category_id" varchar NOT NULL,
          "tag_id" varchar NOT NULL,
          PRIMARY KEY ("tag_category_id", "tag_id"),
          CONSTRAINT "FK_tag_category_tags_category" FOREIGN KEY ("tag_category_id") REFERENCES "tag_category" ("id") ON DELETE CASCADE,
          CONSTRAINT "FK_tag_category_tags_tag" FOREIGN KEY ("tag_id") REFERENCES "tag" ("id") ON DELETE CASCADE
        )
      `);
    }

    // Check if tag_category_id column exists in name table, if not add it
    const tagCategoryIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'name' 
        AND column_name = 'tag_category_id'
      )
    `);

    if (!tagCategoryIdExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "name" 
        ADD COLUMN "tag_category_id" varchar,
        ADD CONSTRAINT "FK_name_tag_category" FOREIGN KEY ("tag_category_id") REFERENCES "tag_category" ("id") ON DELETE CASCADE
      `);
    }

    // Create indexes if they don't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tag_category_tags_category') THEN
          CREATE INDEX "idx_tag_category_tags_category" ON "tag_category_tags" ("tag_category_id");
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tag_category_tags_tag') THEN
          CREATE INDEX "idx_tag_category_tags_tag" ON "tag_category_tags" ("tag_id");
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_name_tag_category_language') THEN
          CREATE INDEX "idx_name_tag_category_language" ON "name" ("tag_category_id", "language_id") WHERE "tag_category_id" IS NOT NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_name_tag_category_language"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tag_category_tags_tag"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tag_category_tags_category"`);

    // Drop foreign key constraint from name table
    await queryRunner.query(`
      ALTER TABLE "name" 
      DROP CONSTRAINT IF EXISTS "FK_name_tag_category",
      DROP COLUMN IF EXISTS "tag_category_id"
    `);

    // Drop junction table
    await queryRunner.query(`DROP TABLE IF EXISTS "tag_category_tags"`);

    // Drop tag_category table
    await queryRunner.query(`DROP TABLE IF EXISTS "tag_category"`);
  }
}
