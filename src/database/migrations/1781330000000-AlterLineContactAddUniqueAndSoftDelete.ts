import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterLineContactAddUniqueAndSoftDelete1781330000000
  implements MigrationInterface
{
  name = 'AlterLineContactAddUniqueAndSoftDelete1781330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "line_contact" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_line_contact_lineUserId" ON "line_contact" ("lineUserId") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_line_contact_lineUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "line_contact" DROP COLUMN IF EXISTS "deletedAt"`,
    );
  }
}
