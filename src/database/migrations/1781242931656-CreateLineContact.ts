import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLineContact1781242931656 implements MigrationInterface {
  name = 'CreateLineContact1781242931656';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "line_contact" ("pictureUrl" character varying, "displayName" character varying NOT NULL, "lineUserId" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f6e196f48bda2bc95045023af16" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "line_contact"`);
  }
}
