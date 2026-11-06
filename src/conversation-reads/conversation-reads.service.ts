import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationReadRepository } from './infrastructure/persistence/conversation-read.repository';
import {
  ConversationRead,
  ConversationUnreadCount,
} from './domain/conversation-read';
import { WebsocketGateway } from '@/websocket/websocket.gateway';

@Injectable()
export class ConversationReadsService {
  constructor(
    private readonly conversationReadRepository: ConversationReadRepository,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  /**
   * Mark a conversation as read by this admin, up to `messageId`
   * (or up to the latest message when omitted).
   */
  async markAsRead(
    conversationId: string,
    userId: number,
    messageId?: string,
  ): Promise<ConversationRead> {
    const message =
      await this.conversationReadRepository.findMessageInConversation(
        conversationId,
        messageId,
      );

    if (messageId && !message) {
      throw new NotFoundException(
        `Message ${messageId} not found in conversation ${conversationId}`,
      );
    }

    const read = await this.conversationReadRepository.upsert({
      conversationId,
      userId,
      lastReadMessageId: message?.id ?? null,
      // Use the message's own timestamp (not "now") so unread counting
      // compares like with like.
      lastReadAt: message?.timestamp ?? new Date(),
    });

    this.websocketGateway.emitConversationRead({
      conversationId: read.conversationId,
      userId: read.userId,
      lastReadMessageId: read.lastReadMessageId,
      lastReadAt: read.lastReadAt,
    });

    return read;
  }

  findReaders(conversationId: string): Promise<ConversationRead[]> {
    return this.conversationReadRepository.findReadersByConversationId(
      conversationId,
    );
  }

  findMyRead(conversationId: string, userId: number) {
    return this.conversationReadRepository.findOne(conversationId, userId);
  }

  async getUnreadCounts(userId: number): Promise<{
    totalUnread: number;
    conversations: ConversationUnreadCount[];
  }> {
    const conversations =
      await this.conversationReadRepository.countUnreadByUser(userId);
    return {
      totalUnread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
      conversations,
    };
  }
}
