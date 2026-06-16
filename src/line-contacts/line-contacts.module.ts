import { Module } from '@nestjs/common';
import { LineContactsService } from './line-contacts.service';
import { LineContactsController } from './line-contacts.controller';
import { RelationalLineContactPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import databaseConfig from '../database/config/database.config';
import { DatabaseConfig } from '@/database/config/database-config.type';
import { DocumentLineContactPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';

const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentLineContactPersistenceModule
  : RelationalLineContactPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [LineContactsController],
  providers: [LineContactsService],
  exports: [LineContactsService, infrastructurePersistenceModule],
})
export class LineContactsModule {}
