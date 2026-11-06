import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { RelationalMessagePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { WebSocketModule } from '@/websocket/websocket.module';
import { ConversationsModule } from '@/conversations/conversations.module';

const infrastructurePersistenceModule = RelationalMessagePersistenceModule;

@Module({
  imports: [
    infrastructurePersistenceModule,
    WebSocketModule,
    ConversationsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService, infrastructurePersistenceModule],
})
export class MessagesModule {}
