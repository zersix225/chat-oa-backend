import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTiktokPlatform1795339715563 implements MigrationInterface {
  name = 'AddTiktokPlatform1795339715563';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."contact_contactplatform_enum" RENAME TO "contact_contactplatform_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contact_contactplatform_enum" AS ENUM('line', 'facebook', 'instagram', 'tiktok')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact" ALTER COLUMN "contactPlatform" TYPE "public"."contact_contactplatform_enum" USING "contactPlatform"::"text"::"public"."contact_contactplatform_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."contact_contactplatform_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."message_messageplatform_enum" RENAME TO "message_messageplatform_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."message_messageplatform_enum" AS ENUM('line', 'facebook', 'instagram', 'tiktok')`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" ALTER COLUMN "messagePlatform" TYPE "public"."message_messageplatform_enum" USING "messagePlatform"::"text"::"public"."message_messageplatform_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."message_messageplatform_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."message_messageplatform_enum_old" AS ENUM('line', 'facebook', 'instagram')`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" ALTER COLUMN "messagePlatform" TYPE "public"."message_messageplatform_enum_old" USING "messagePlatform"::"text"::"public"."message_messageplatform_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."message_messageplatform_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."message_messageplatform_enum_old" RENAME TO "message_messageplatform_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contact_contactplatform_enum_old" AS ENUM('line', 'facebook', 'instagram')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact" ALTER COLUMN "contactPlatform" TYPE "public"."contact_contactplatform_enum_old" USING "contactPlatform"::"text"::"public"."contact_contactplatform_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."contact_contactplatform_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."contact_contactplatform_enum_old" RENAME TO "contact_contactplatform_enum"`,
    );
  }
}
