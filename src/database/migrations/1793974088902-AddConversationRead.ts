import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationRead1793974088902 implements MigrationInterface {
  name = 'AddConversationRead1793974088902';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "conversation_read" ("lastReadAt" TIMESTAMP NOT NULL, "lastReadMessageId" uuid, "userId" integer NOT NULL, "conversationId" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4fdcf521087a239c7474ee3a3b0" UNIQUE ("conversationId", "userId"), CONSTRAINT "PK_75a4647e6c9b5e14e7c98f82e63" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_385ad07ab0d7c26b3b140b167d" ON "conversation_read" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_read" ADD CONSTRAINT "FK_ca4b327867c9a9ba2cc4783b9fa" FOREIGN KEY ("lastReadMessageId") REFERENCES "message"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_read" ADD CONSTRAINT "FK_385ad07ab0d7c26b3b140b167d2" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_read" ADD CONSTRAINT "FK_6ba55c692c0c4c9fc5367986452" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_read" DROP CONSTRAINT "FK_6ba55c692c0c4c9fc5367986452"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_read" DROP CONSTRAINT "FK_385ad07ab0d7c26b3b140b167d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_read" DROP CONSTRAINT "FK_ca4b327867c9a9ba2cc4783b9fa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_385ad07ab0d7c26b3b140b167d"`,
    );
    await queryRunner.query(`DROP TABLE "conversation_read"`);
  }
}
