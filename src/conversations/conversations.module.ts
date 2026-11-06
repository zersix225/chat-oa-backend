import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { RelationalConversationsPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { UsersModule } from '@/users/users.module';
import { WebSocketModule } from '@/websocket/websocket.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalConversationsPersistenceModule,
    UsersModule,
    WebSocketModule,
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService, RelationalConversationsPersistenceModule],
})
export class ConversationsModule {}
