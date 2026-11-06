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
import { IPaginationOptions } from '@/utils/types/pagination-options';

@Injectable()
export class MessagesRelationalRepository implements MessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  async create(data: Message): Promise<Message> {
    const saved = await this.messageRepository.save(
      this.messageRepository.create(MessageMapper.toPersistence(data)),
    );
    // Reload so eager relations (file) are populated.
    const entity = saved.fileId
      ? await this.messageRepository.findOneOrFail({ where: { id: saved.id } })
      : saved;
    return MessageMapper.toDomain(entity);
  }

  async findAllWithPaginationByAdmin({
    paginationOptions,
    conversationId,
    senderType,
  }: {
    paginationOptions: IPaginationOptions;
    conversationId: Message['conversationId'];
    senderType?: Message['senderType'];
  }): Promise<{ massages: Message[]; total: number }> {
    const [entities, total] = await this.messageRepository.findAndCount({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      relations: {
        admin: true,
      },
      where: {
        conversationId: conversationId,
        ...(senderType ? { senderType } : {}),
      },
      order: {
        timestamp: 'DESC',
      },
    });

    return {
      massages: entities.map((entity) => MessageMapper.toDomain(entity)),
      total,
    };
  }

  async findById(id: Message['id']): Promise<NullableType<Message>> {
    const entity = await this.messageRepository.findOne({ where: { id } });
    return entity ? MessageMapper.toDomain(entity) : null;
  }

  async update(
    id: Message['id'],
    payload: DeepPartial<Message>,
  ): Promise<Message | null> {
    const entity = await this.messageRepository.findOne({ where: { id } });
    if (!entity) return null;
    const updated = await this.messageRepository.save(
      this.messageRepository.create(
        MessageMapper.toPersistence({
          ...MessageMapper.toDomain(entity),
          ...payload,
        } as Message),
      ),
    );
    return MessageMapper.toDomain(updated);
  }

  async remove(id: Message['id']): Promise<void> {
    await this.messageRepository.softDelete(id);
  }

  async findBySenderId(senderId: string): Promise<MessageThreadItem[]> {
    const rows = await this.messageRepository
      .createQueryBuilder('m')
      .select('m.id', 'id')
      .addSelect('m.content', 'content')
      .addSelect('m.timestamp', 'timestamp')
      .addSelect('m."senderId"', 'senderId')
      .addSelect('m."senderType"', 'senderType')
      .addSelect('lc."displayName"', 'displayName')
      .addSelect('lc."pictureUrl"', 'pictureUrl')
      .leftJoin('customerId', 'c', 'c."customerId" = m."senderId"')
      .where('m."senderId" = :senderId', { senderId })
      .orderBy('m.timestamp', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      id: r.id,
      content: r.content,
      timestamp: r.timestamp,
      senderId: r.senderId,
      senderType: r.senderType,
      displayName: r.displayName ?? r.senderId,
      pictureUrl: r.pictureUrl ?? null,
    }));
  }

  async findConversations(): Promise<ConversationItem[]> {
    const rows = await this.messageRepository
      .createQueryBuilder('m')
      .select('m."senderId"', 'senderId')
      .addSelect('m."sender_type"', 'senderType')
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
      senderType: r.senderType,
      displayName: r.displayName ?? r.senderId,
      pictureUrl: r.pictureUrl ?? null,
      lastMessage: r.lastMessage,
      lastTimestamp: r.lastTimestamp,
    }));
  }
}
