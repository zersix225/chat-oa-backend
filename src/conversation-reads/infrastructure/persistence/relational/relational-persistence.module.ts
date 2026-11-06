import { Module } from '@nestjs/common';
import { ConversationReadRepository } from '../conversation-read.repository';
import { ConversationReadRelationalRepository } from './repositories/conversation-read.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationReadEntity } from './entities/conversation-read.entity';
import { MessageEntity } from '@/messages/infrastructure/persistence/relational/entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationReadEntity, MessageEntity])],
  providers: [
    {
      provide: ConversationReadRepository,
      useClass: ConversationReadRelationalRepository,
    },
  ],
  exports: [ConversationReadRepository],
})
export class RelationalConversationReadPersistenceModule {}
