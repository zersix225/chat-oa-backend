import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ConversationReadsService } from './conversation-reads.service';
import { ConversationReadsController } from './conversation-reads.controller';
import { RelationalConversationReadPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { WebSocketModule } from '@/websocket/websocket.module';

@Module({
  imports: [
    WebSocketModule,
    // do not remove this comment
    RelationalConversationReadPersistenceModule,
  ],
  controllers: [ConversationReadsController],
  providers: [ConversationReadsService],
  exports: [
    ConversationReadsService,
    RelationalConversationReadPersistenceModule,
  ],
})
export class ConversationReadsModule {}
