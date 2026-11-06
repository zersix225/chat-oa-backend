import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageMedia1794100000000 implements MigrationInterface {
  name = 'AddMessageMedia1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."message_messagetype_enum" AS ENUM('text', 'image', 'video', 'audio', 'file', 'sticker')`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" ADD "messageType" "public"."message_messagetype_enum" NOT NULL DEFAULT 'text'`,
    );
    await queryRunner.query(`ALTER TABLE "message" ADD "fileId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_ce2da017b61bdb9fd01415a618b" FOREIGN KEY ("fileId") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT "FK_ce2da017b61bdb9fd01415a618b"`,
    );
    await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "fileId"`);
    await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "messageType"`);
    await queryRunner.query(`DROP TYPE "public"."message_messagetype_enum"`);
  }
}
