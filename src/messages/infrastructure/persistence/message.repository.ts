import { Message, SenderType } from '../../domain/message';
import { DeepPartial } from '@/utils/types/deep-partial.type';
import { NullableType } from '@/utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';

export interface ConversationItem {
  senderId: string;
  senderType: SenderType;
  displayName: string;
  pictureUrl: string | null;
  lastMessage: string;
  lastTimestamp: Date;
}

export interface MessageThreadItem {
  id: number;
  content: string;
  senderType: SenderType;
  timestamp: Date;
  senderId: string;
  displayName: string;
  pictureUrl: string | null;
}

export abstract class MessageRepository {
  abstract create(data: Omit<Message, 'id'>): Promise<Message>;

  abstract findAllWithPaginationByAdmin({
    paginationOptions,
    conversationId,
    senderType,
  }: {
    paginationOptions: IPaginationOptions;
    conversationId: Message['conversationId'];
    senderType?: Message['senderType'];
  }): Promise<{ massages: Message[]; total: number }>;

  abstract findById(id: Message['id']): Promise<NullableType<Message>>;

  abstract findConversations(): Promise<ConversationItem[]>;

  abstract findBySenderId(senderId: string): Promise<MessageThreadItem[]>;

  abstract update(
    id: Message['id'],
    payload: DeepPartial<Message>,
  ): Promise<Message | null>;

  abstract remove(id: Message['id']): Promise<void>;
}
