import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from '../entities/message.entity';
import { MessageRepository } from '../../message.repository';
import { Message } from '../../../../domain/message';
import { MessageMapper } from '../mappers/message.mapper';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { DeepPartial } from '../../../../../utils/types/deep-partial.type';

@Injectable()
export class MessagesRelationalRepository implements MessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly repository: Repository<MessageEntity>,
  ) {}

  async create(
    data: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Message> {
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
}
