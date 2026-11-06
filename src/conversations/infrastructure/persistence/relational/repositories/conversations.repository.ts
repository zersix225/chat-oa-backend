import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConversationsEntity } from '../entities/conversations.entity';
import { NullableType } from '@/utils/types/nullable.type';
import { Conversations } from '../../../../domain/conversations';
import { ConversationsRepository } from '../../conversations.repository';
import { ConversationsMapper } from '../mappers/conversations.mapper';
import { IPaginationOptions } from '@/utils/types/pagination-options';

@Injectable()
export class ConversationsRelationalRepository implements ConversationsRepository {
  constructor(
    @InjectRepository(ConversationsEntity)
    private readonly conversationsRepository: Repository<ConversationsEntity>,
  ) {}

  async create(data: Conversations): Promise<Conversations> {
    const persistenceModel = ConversationsMapper.toPersistence(data);
    const newEntity = await this.conversationsRepository.save(
      this.conversationsRepository.create(persistenceModel),
    );
    return ConversationsMapper.toDomain(newEntity);
  }

  async findByIdWithDelete(
    id: Conversations['contactId'],
  ): Promise<NullableType<Conversations>> {
    const entity = await this.conversationsRepository.findOne({
      where: { contactId: id },
      withDeleted: true,
      relations: ['contact', 'messages'],
    });

    return entity ? ConversationsMapper.toDomain(entity) : null;
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Conversations[]> {
    const entities = await this.conversationsRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      relations: {
        contact: true,
        lastMessage: true,
        assignee: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });
    return entities.map((entity) => ConversationsMapper.toDomain(entity));
  }

  async findById(
    id: Conversations['id'],
  ): Promise<NullableType<Conversations>> {
    const entity = await this.conversationsRepository.findOne({
      where: { id },
      relations: {
        messages: true,
        contact: true,
        assignee: true,
      },
      order: {
        messages: {
          timestamp: 'ASC',
        },
      },
    });

    return entity ? ConversationsMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Conversations['id'][]): Promise<Conversations[]> {
    const entities = await this.conversationsRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => ConversationsMapper.toDomain(entity));
  }

  async findByContactId(
    contactId: Conversations['contactId'],
  ): Promise<NullableType<Conversations>> {
    const entity = await this.conversationsRepository.findOne({
      where: { contactId },
    });

    return entity ? ConversationsMapper.toDomain(entity) : null;
  }

  async update(
    id: Conversations['id'],
    payload: Partial<Conversations>,
  ): Promise<Conversations> {
    const entity = await this.conversationsRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.conversationsRepository.save(
      this.conversationsRepository.create(
        ConversationsMapper.toPersistence({
          ...ConversationsMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return ConversationsMapper.toDomain(updatedEntity);
  }

  async remove(id: Conversations['id']): Promise<void> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id },
      relations: ['messages', 'contact'],
    });

    if (!conversation) {
      throw new Error('Record not found');
    }
    await this.conversationsRepository.softRemove(conversation);
  }
}
