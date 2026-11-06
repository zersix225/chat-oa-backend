import { Message, MessageType } from '@/messages/domain/message';
import { MessageEntity } from '../entities/message.entity';
import { FileMapper } from '@/files/infrastructure/persistence/relational/mappers/file.mapper';

export class MessageMapper {
  static toDomain(raw: MessageEntity): Message {
    const domain = new Message();
    domain.id = raw.id;
    domain.content = raw.content;
    domain.conversationId = raw.conversationId;
    domain.messageType = raw.messageType;
    domain.fileId = raw.fileId ?? null;
    domain.file = raw.file ? FileMapper.toDomain(raw.file) : null;
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
    entity.messageType = domain.messageType ?? MessageType.TEXT;
    entity.fileId = domain.fileId ?? domain.file?.id ?? null;
    entity.adminId = domain.adminId;
    entity.conversationId = domain.conversationId;
    entity.messagePlatform = domain.messagePlatform;
    entity.senderType = domain.senderType;
    entity.timestamp = domain.timestamp;

    return entity;
  }
}
