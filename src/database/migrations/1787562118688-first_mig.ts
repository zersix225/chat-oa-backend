import { MigrationInterface, QueryRunner } from 'typeorm';

export class FirstMig1787562118688 implements MigrationInterface {
  name = 'FirstMig1787562118688';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "role" ("id" integer NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "status" ("id" integer NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_e12743a7086ec826733f54e1d95" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "file" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "path" character varying NOT NULL, CONSTRAINT "PK_36b46d232307066b3a2c9ea3a1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "email" character varying, "password" character varying, "provider" character varying NOT NULL DEFAULT 'email', "socialId" character varying, "firstName" character varying, "lastName" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "photoId" uuid, "roleId" integer, "statusId" integer, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "REL_75e2be4ce11d447ef43be0e374" UNIQUE ("photoId"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bd2fe7a8e694dedc4ec2f666f" ON "user" ("socialId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_58e4dbff0e1a32a9bdc861bb29" ON "user" ("firstName") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f0e1b4ecdca13b177e2e3a0613" ON "user" ("lastName") `,
    );
    await queryRunner.query(
      `CREATE TABLE "session" ("id" SERIAL NOT NULL, "hash" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "userId" integer, CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d2f174ef04fb312fdebd0ddc5" ON "session" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contact_contactplatform_enum" AS ENUM('line', 'facebook', 'instagram')`,
    );
    await queryRunner.query(
      `CREATE TABLE "contact" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerId" character varying NOT NULL, "displayName" character varying NOT NULL, "pictureUrl" character varying, "contactPlatform" "public"."contact_contactplatform_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_a54f4088bd2e596cc15c1f7aa3d" UNIQUE ("customerId"), CONSTRAINT "PK_2cbbe00f59ab6b3bb5b8d19f989" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "contactId" uuid NOT NULL, "lastMessageId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, CONSTRAINT "REL_c6b7bd06b2ed2058982f457296" UNIQUE ("contactId"), CONSTRAINT "REL_c6e63680bca6085833f396ac1f" UNIQUE ("lastMessageId"), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."message_messageplatform_enum" AS ENUM('line', 'facebook', 'instagram')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."message_sendertype_enum" AS ENUM('user', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversationId" uuid NOT NULL, "adminId" integer, "content" character varying NOT NULL, "messagePlatform" "public"."message_messageplatform_enum" NOT NULL, "senderType" "public"."message_sendertype_enum" NOT NULL DEFAULT 'user', "timestamp" TIMESTAMP NOT NULL, "deletedAt" TIMESTAMP, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_75e2be4ce11d447ef43be0e374f" FOREIGN KEY ("photoId") REFERENCES "file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_dc18daa696860586ba4667a9d31" FOREIGN KEY ("statusId") REFERENCES "status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_c6b7bd06b2ed2058982f4572961" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_c6e63680bca6085833f396ac1fa" FOREIGN KEY ("lastMessageId") REFERENCES "message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_7cf4a4df1f2627f72bf6231635f" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" ADD CONSTRAINT "FK_8f2426b56103f39a64bdda47dde" FOREIGN KEY ("adminId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT "FK_8f2426b56103f39a64bdda47dde"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" DROP CONSTRAINT "FK_7cf4a4df1f2627f72bf6231635f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_c6e63680bca6085833f396ac1fa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_c6b7bd06b2ed2058982f4572961"`,
    );
    await queryRunner.query(
      `ALTER TABLE "session" DROP CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_dc18daa696860586ba4667a9d31"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_c28e52f758e7bbc53828db92194"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_75e2be4ce11d447ef43be0e374f"`,
    );
    await queryRunner.query(`DROP TABLE "message"`);
    await queryRunner.query(`DROP TYPE "public"."message_sendertype_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."message_messageplatform_enum"`,
    );
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(`DROP TABLE "contact"`);
    await queryRunner.query(
      `DROP TYPE "public"."contact_contactplatform_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3d2f174ef04fb312fdebd0ddc5"`,
    );
    await queryRunner.query(`DROP TABLE "session"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f0e1b4ecdca13b177e2e3a0613"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_58e4dbff0e1a32a9bdc861bb29"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9bd2fe7a8e694dedc4ec2f666f"`,
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "file"`);
    await queryRunner.query(`DROP TABLE "status"`);
    await queryRunner.query(`DROP TABLE "role"`);
  }
}
