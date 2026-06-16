import { CreateMessageDto } from './dto/create-message.dto';
import { Injectable } from '@nestjs/common';
import {
  ConversationItem,
  MessageRepository,
  MessageThreadItem,
} from './infrastructure/persistence/message.repository';
import { Message } from './domain/message';
import { NullableType } from '@/utils/types/nullable.type';

@Injectable()
export class MessagesService {
  constructor(private readonly messageRepository: MessageRepository) {}

  async create(payload: CreateMessageDto): Promise<Message> {
    return this.messageRepository.create(payload);
  }

  async findById(id: Message['id']): Promise<NullableType<Message>> {
    return this.messageRepository.findById(id);
  }

  async findConversations(): Promise<ConversationItem[]> {
    return this.messageRepository.findConversations();
  }

  async findBySenderId(senderId: string): Promise<MessageThreadItem[]> {
    return this.messageRepository.findBySenderId(senderId);
  }
}
