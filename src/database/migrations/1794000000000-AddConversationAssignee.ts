import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationAssignee1794000000000 implements MigrationInterface {
  name = 'AddConversationAssignee1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "assigneeId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_assigneeId" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_assigneeId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN "assigneeId"`,
    );
  }
}
