import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './entities/message.entity';
import { MessageRepository } from '../message.repository';
import { MessagesRelationalRepository } from './repositories/message.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity])],
  providers: [
    {
      provide: MessageRepository,
      useClass: MessagesRelationalRepository,
    },
  ],
  exports: [MessageRepository],
})
export class RelationalMessagePersistenceModule {}
