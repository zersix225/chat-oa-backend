import { Message } from '../../domain/message';
import { DeepPartial } from '@/utils/types/deep-partial.type';
import { NullableType } from '@/utils/types/nullable.type';

export interface ConversationItem {
  senderId: string;
  displayName: string;
  pictureUrl: string | null;
  lastMessage: string;
  lastTimestamp: Date;
}

export interface MessageThreadItem {
  id: number;
  content: string;
  timestamp: Date;
  senderId: string;
  displayName: string;
  pictureUrl: string | null;
}

export abstract class MessageRepository {
  abstract create(data: Omit<Message, 'id'>): Promise<Message>;

  abstract findById(id: Message['id']): Promise<NullableType<Message>>;

  abstract findConversations(): Promise<ConversationItem[]>;

  abstract findBySenderId(senderId: string): Promise<MessageThreadItem[]>;

  abstract update(
    id: Message['id'],
    payload: DeepPartial<Message>,
  ): Promise<Message | null>;

  abstract remove(id: Message['id']): Promise<void>;
}
