import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { RelationalMessagePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

const infrastructurePersistenceModule = RelationalMessagePersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],

  providers: [MessagesService],
  exports: [MessagesService, infrastructurePersistenceModule],
})
export class MessagesModule {}
