import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminAuth1762992000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_user" (
        "id" uuid PRIMARY KEY,
        "email" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "password_hash" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_session" (
        "id" uuid PRIMARY KEY,
        "token_hash" text NOT NULL UNIQUE,
        "user_id" uuid NOT NULL REFERENCES "admin_user" ("id") ON DELETE CASCADE,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ip_address" text,
        "user_agent" text
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_auth_session_user" ON "auth_session" ("user_id")`);

    await queryRunner.query(`
      CREATE TABLE "password_reset_token" (
        "id" uuid PRIMARY KEY,
        "token_hash" text NOT NULL UNIQUE,
        "user_id" uuid NOT NULL REFERENCES "admin_user" ("id") ON DELETE CASCADE,
        "expires_at" TIMESTAMP NOT NULL,
        "used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_password_reset_token_user" ON "password_reset_token" ("user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_token"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_session"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_user"`);
  }
}
