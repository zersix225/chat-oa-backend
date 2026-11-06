import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { RelationalLineContactPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

const infrastructurePersistenceModule = RelationalLineContactPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService, infrastructurePersistenceModule],
})
export class ContactsModule {}
