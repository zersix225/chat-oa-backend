import { Module } from '@nestjs/common';
import { ConversationsRepository } from '../conversations.repository';
import { ConversationsRelationalRepository } from './repositories/conversations.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsEntity } from './entities/conversations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationsEntity])],
  providers: [
    {
      provide: ConversationsRepository,
      useClass: ConversationsRelationalRepository,
    },
  ],
  exports: [ConversationsRepository],
})
export class RelationalConversationsPersistenceModule {}
