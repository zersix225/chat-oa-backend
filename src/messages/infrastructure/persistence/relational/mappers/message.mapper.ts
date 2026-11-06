import { Message } from '@/messages/domain/message';
import { MessageEntity } from '../entities/message.entity';

export class MessageMapper {
  static toDomain(raw: MessageEntity): Message {
    const domain = new Message();
    domain.id = raw.id;
    domain.content = raw.content;
    domain.adminId = raw.adminId;
    domain.admin = raw.admin;
    domain.messagePlatform = raw.messagePlatform;
    domain.senderType = raw.senderType;
    domain.timestamp = raw.timestamp;

    return domain;
  }

  static toPersistence(domain: Message): MessageEntity {
    const entity = new MessageEntity();
    if (domain.id) {
      entity.id = domain.id;
    }
    entity.content = domain.content;
    entity.adminId = domain.adminId;
    entity.conversationId = domain.conversationId;
    entity.messagePlatform = domain.messagePlatform;
    entity.senderType = domain.senderType;
    entity.timestamp = domain.timestamp;

    return entity;
  }
}
