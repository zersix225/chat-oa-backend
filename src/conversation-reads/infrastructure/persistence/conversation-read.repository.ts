import { NullableType } from '../../../utils/types/nullable.type';
import {
  ConversationRead,
  ConversationUnreadCount,
} from '../../domain/conversation-read';

export type LatestMessageRef = { id: string; timestamp: Date };

export abstract class ConversationReadRepository {
  /** Insert or move forward the read pointer of one admin in one conversation. */
  abstract upsert(data: {
    conversationId: string;
    userId: number;
    lastReadMessageId: string | null;
    lastReadAt: Date;
  }): Promise<ConversationRead>;

  abstract findOne(
    conversationId: string,
    userId: number,
  ): Promise<NullableType<ConversationRead>>;

  /** All admins who have read this conversation (with user loaded). */
  abstract findReadersByConversationId(
    conversationId: string,
  ): Promise<ConversationRead[]>;

  /**
   * Customer messages newer than this admin's read pointer, per conversation.
   * Conversations with 0 unread are omitted.
   */
  abstract countUnreadByUser(
    userId: number,
  ): Promise<ConversationUnreadCount[]>;

  /** Latest message in a conversation, or a specific one if messageId given. */
  abstract findMessageInConversation(
    conversationId: string,
    messageId?: string,
  ): Promise<NullableType<LatestMessageRef>>;
}
