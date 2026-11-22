import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTiktokAccount1795344943446 implements MigrationInterface {
  name = 'AddTiktokAccount1795344943446';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tiktok_account" ("refreshTokenExpiresAt" TIMESTAMP NOT NULL, "refreshToken" text NOT NULL, "accessTokenExpiresAt" TIMESTAMP NOT NULL, "accessToken" text NOT NULL, "scope" character varying NOT NULL, "avatarUrl" character varying, "displayName" character varying, "openId" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8bb6fb54ddce3562e13fca12f86" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_dccc391e6ae3cf6ea44263ecbe" ON "tiktok_account" ("openId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dccc391e6ae3cf6ea44263ecbe"`,
    );
    await queryRunner.query(`DROP TABLE "tiktok_account"`);
  }
}
