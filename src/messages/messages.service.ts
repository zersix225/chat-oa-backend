import { CreateMessageDto } from './dto/create-message.dto';
import { Injectable } from '@nestjs/common';
import {
  ConversationItem,
  MessageRepository,
} from './infrastructure/persistence/message.repository';
import { Message, MessageType } from './domain/message';
import { WebsocketGateway } from '@/websocket/websocket.gateway';
import { ConversationsRepository } from '@/conversations/infrastructure/persistence/conversations.repository';
import { IPaginationOptions } from '@/utils/types/pagination-options';

@Injectable()
export class MessagesService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly conversationRepository: ConversationsRepository,
    private readonly webhookGateway: WebsocketGateway,
  ) {}

  async create(payload: CreateMessageDto): Promise<Message> {
    const message = await this.messageRepository.create({
      ...payload,
      messageType: payload.messageType ?? MessageType.TEXT,
    });
    await this.conversationRepository.update(payload.conversationId, {
      lastMessageId: message.id,
    });

    // Emit only after it is saved, so clients get the real id.
    this.webhookGateway.emitNewMessage({
      ...message,
      conversationId: payload.conversationId,
    });
    return message;
  }

  findAllWithPaginationByAdmin({
    paginationOptions,
    conversationId,
    senderType,
  }: {
    paginationOptions: IPaginationOptions;
    conversationId: Message['conversationId'];
    senderType?: Message['senderType'];
  }) {
    return this.messageRepository.findAllWithPaginationByAdmin({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
      conversationId,
      senderType,
    });
  }

  async findById(id: Message['id']) {
    return this.messageRepository.findById(id);
  }

  async findConversations(): Promise<ConversationItem[]> {
    return this.messageRepository.findConversations();
  }

  // async findBySenderId(
  //   customerId: Message['customerId'],
  // ): Promise<MessageThreadItem[]> {
  //   return this.messageRepository.findBySenderId(customerId);
  // }
}
