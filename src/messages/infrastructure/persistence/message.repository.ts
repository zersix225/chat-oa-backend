import { Message } from '../../domain/message';
import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';

export abstract class MessageRepository {
  abstract create(
    data: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Message>;

  abstract findById(id: Message['id']): Promise<NullableType<Message>>;

  abstract update(
    id: Message['id'],
    payload: DeepPartial<Message>,
  ): Promise<Message | null>;

  abstract remove(id: Message['id']): Promise<void>;
}
