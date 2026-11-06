import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationReadEntity } from '../entities/conversation-read.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import {
  ConversationRead,
  ConversationUnreadCount,
} from '../../../../domain/conversation-read';
import {
  ConversationReadRepository,
  LatestMessageRef,
} from '../../conversation-read.repository';
import { ConversationReadMapper } from '../mappers/conversation-read.mapper';
import { MessageEntity } from '@/messages/infrastructure/persistence/relational/entities/message.entity';
import { SenderType } from '@/messages/domain/message';

@Injectable()
export class ConversationReadRelationalRepository implements ConversationReadRepository {
  constructor(
    @InjectRepository(ConversationReadEntity)
    private readonly conversationReadRepository: Repository<ConversationReadEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  async upsert(data: {
    conversationId: string;
    userId: number;
    lastReadMessageId: string | null;
    lastReadAt: Date;
  }): Promise<ConversationRead> {
    // Single atomic statement; GREATEST() keeps the pointer from moving
    // backwards if an older "mark read" request arrives late.
    await this.conversationReadRepository.query(
      `INSERT INTO "conversation_read"
         ("conversationId", "userId", "lastReadMessageId", "lastReadAt")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("conversationId", "userId") DO UPDATE SET
         "lastReadMessageId" = CASE
           WHEN EXCLUDED."lastReadAt" >= "conversation_read"."lastReadAt"
           THEN EXCLUDED."lastReadMessageId"
           ELSE "conversation_read"."lastReadMessageId" END,
         "lastReadAt" = GREATEST("conversation_read"."lastReadAt", EXCLUDED."lastReadAt"),
         "updatedAt" = now()`,
      [
        data.conversationId,
        data.userId,
        data.lastReadMessageId,
        data.lastReadAt,
      ],
    );

    const entity = await this.conversationReadRepository.findOneOrFail({
      where: { conversationId: data.conversationId, userId: data.userId },
    });
    return ConversationReadMapper.toDomain(entity);
  }

  async findOne(
    conversationId: string,
    userId: number,
  ): Promise<NullableType<ConversationRead>> {
    const entity = await this.conversationReadRepository.findOne({
      where: { conversationId, userId },
    });
    return entity ? ConversationReadMapper.toDomain(entity) : null;
  }

  async findReadersByConversationId(
    conversationId: string,
  ): Promise<ConversationRead[]> {
    const entities = await this.conversationReadRepository.find({
      where: { conversationId },
      relations: { user: true },
      order: { lastReadAt: 'DESC' },
    });
    return entities.map((entity) => ConversationReadMapper.toDomain(entity));
  }

  async countUnreadByUser(userId: number): Promise<ConversationUnreadCount[]> {
    const rows: { conversationId: string; unreadCount: string }[] =
      await this.messageRepository
        .createQueryBuilder('m')
        .select('m."conversationId"', 'conversationId')
        .addSelect('COUNT(*)', 'unreadCount')
        .leftJoin(
          ConversationReadEntity,
          'cr',
          'cr."conversationId" = m."conversationId" AND cr."userId" = :userId',
          { userId },
        )
        .where('m."senderType" = :senderType', { senderType: SenderType.USER })
        .andWhere(
          '(cr."lastReadAt" IS NULL OR m."timestamp" > cr."lastReadAt")',
        )
        .groupBy('m."conversationId"')
        .getRawMany();

    return rows.map((r) => ({
      conversationId: r.conversationId,
      unreadCount: Number(r.unreadCount),
    }));
  }

  async findMessageInConversation(
    conversationId: string,
    messageId?: string,
  ): Promise<NullableType<LatestMessageRef>> {
    const entity = await this.messageRepository.findOne({
      select: { id: true, timestamp: true },
      where: messageId ? { id: messageId, conversationId } : { conversationId },
      order: { timestamp: 'DESC' },
    });
    return entity ? { id: entity.id, timestamp: entity.timestamp } : null;
  }
}
