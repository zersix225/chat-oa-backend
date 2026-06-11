import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessageTable1781161818025 implements MigrationInterface {
  name = 'CreateMessageTable1781161818025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."message_message_platform_enum" AS ENUM('line', 'facebook', 'instagram')`,
    );
    await queryRunner.query(
      `CREATE TABLE "message" ("id" SERIAL NOT NULL, "content" character varying NOT NULL, "message_platform" "public"."message_message_platform_enum" NOT NULL, "senderId" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "message"`);
    await queryRunner.query(
      `DROP TYPE "public"."message_message_platform_enum"`,
    );
  }
}
