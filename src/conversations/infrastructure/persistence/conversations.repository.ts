import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { Conversations } from '../../domain/conversations';

export abstract class ConversationsRepository {
  abstract create(
    data: Omit<Conversations, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Conversations>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Conversations[]>;

  abstract findByContactId(
    contactId: Conversations['contactId'],
  ): Promise<NullableType<Conversations>>;

  abstract findByIdWithDelete(
    id: Conversations['id'],
  ): Promise<NullableType<Conversations>>;

  abstract findById(
    id: Conversations['id'],
  ): Promise<NullableType<Conversations>>;

  abstract findByIds(ids: Conversations['id'][]): Promise<Conversations[]>;

  abstract update(
    id: Conversations['id'],
    payload: DeepPartial<Conversations>,
  ): Promise<Conversations | null>;

  abstract remove(id: Conversations['id']): Promise<void>;
}
