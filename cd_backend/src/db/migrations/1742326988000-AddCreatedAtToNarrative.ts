import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtToNarrative1742326988000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add created_at column to narrative table
    await queryRunner.query(`
      ALTER TABLE "narrative" 
      ADD COLUMN "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove created_at column from narrative table
    await queryRunner.query(`
      ALTER TABLE "narrative" 
      DROP COLUMN "created_at"
    `);
  }
}
