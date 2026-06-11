import { Message } from '../../../../domain/message';
import { MessageEntity } from '../entities/message.entity';

export class MessageMapper {
  static toDomain(raw: MessageEntity): Message {
    const domain = new Message();
    domain.id = raw.id;
    domain.content = raw.content;
    domain.senderId = raw.senderId;
    domain.messagePlatform = raw.messagePlatform;
    domain.timestamp = raw.timestamp;
    return domain;
  }

  static toPersistence(domain: Message): MessageEntity {
    const entity = new MessageEntity();
    if (domain.id) {
      entity.id = domain.id;
    }
    entity.content = domain.content;
    entity.senderId = domain.senderId;
    entity.messagePlatform = domain.messagePlatform;
    entity.timestamp = domain.timestamp;
    return entity;
  }
}
