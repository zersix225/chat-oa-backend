import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from '../entities/message.entity';
import {
  ConversationItem,
  MessageRepository,
  MessageThreadItem,
} from '../../message.repository';
import { Message } from '@/messages/domain/message';
import { MessageMapper } from '../mappers/message.mapper';
import { NullableType } from '@/utils/types/nullable.type';
import { DeepPartial } from '@/utils/types/deep-partial.type';

@Injectable()
export class MessagesRelationalRepository implements MessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly repository: Repository<MessageEntity>,
  ) {}

  async create(data: Omit<Message, 'id'>): Promise<Message> {
    const entity = await this.repository.save(
      this.repository.create(MessageMapper.toPersistence(data as Message)),
    );
    return MessageMapper.toDomain(entity);
  }

  async findById(id: Message['id']): Promise<NullableType<Message>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? MessageMapper.toDomain(entity) : null;
  }

  async update(
    id: Message['id'],
    payload: DeepPartial<Message>,
  ): Promise<Message | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;
    const updated = await this.repository.save(
      this.repository.create(
        MessageMapper.toPersistence({
          ...MessageMapper.toDomain(entity),
          ...payload,
        } as Message),
      ),
    );
    return MessageMapper.toDomain(updated);
  }

  async remove(id: Message['id']): Promise<void> {
    await this.repository.softDelete(id);
  }

  async findBySenderId(senderId: string): Promise<MessageThreadItem[]> {
    const rows = await this.repository
      .createQueryBuilder('m')
      .select('m.id', 'id')
      .addSelect('m.content', 'content')
      .addSelect('m.timestamp', 'timestamp')
      .addSelect('m."senderId"', 'senderId')
      .addSelect('lc."displayName"', 'displayName')
      .addSelect('lc."pictureUrl"', 'pictureUrl')
      .leftJoin('line_contact', 'lc', 'lc."lineUserId" = m."senderId"')
      .where('m."senderId" = :senderId', { senderId })
      .orderBy('m.timestamp', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      id: r.id,
      content: r.content,
      timestamp: r.timestamp,
      senderId: r.senderId,
      displayName: r.displayName ?? r.senderId,
      pictureUrl: r.pictureUrl ?? null,
    }));
  }

  async findConversations(): Promise<ConversationItem[]> {
    const rows = await this.repository
      .createQueryBuilder('m')
      .select('m."senderId"', 'senderId')
      .addSelect('m.content', 'lastMessage')
      .addSelect('m.timestamp', 'lastTimestamp')
      .addSelect('lc."displayName"', 'displayName')
      .addSelect('lc."pictureUrl"', 'pictureUrl')
      .innerJoin(
        (sub) =>
          sub
            .select('"senderId"')
            .addSelect('MAX(id)', 'maxId')
            .from(MessageEntity, 'sub')
            .groupBy('"senderId"'),
        'latest',
        'latest."senderId" = m."senderId" AND latest."maxId" = m.id',
      )
      .leftJoin('line_contact', 'lc', 'lc."lineUserId" = m."senderId"')
      .orderBy('m.timestamp', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      senderId: r.senderId,
      displayName: r.displayName ?? r.senderId,
      pictureUrl: r.pictureUrl ?? null,
      lastMessage: r.lastMessage,
      lastTimestamp: r.lastTimestamp,
    }));
  }
}
