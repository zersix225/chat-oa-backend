import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { RelationalMessagePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

const infrastructurePersistenceModule = RelationalMessagePersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService, infrastructurePersistenceModule],
})
export class MessagesModule {}
