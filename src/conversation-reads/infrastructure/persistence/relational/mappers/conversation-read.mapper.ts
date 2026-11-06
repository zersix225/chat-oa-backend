import { ConversationRead } from '../../../../domain/conversation-read';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { ConversationReadEntity } from '../entities/conversation-read.entity';

export class ConversationReadMapper {
  static toDomain(raw: ConversationReadEntity): ConversationRead {
    const domainEntity = new ConversationRead();
    domainEntity.id = raw.id;
    domainEntity.conversationId = raw.conversationId;
    domainEntity.userId = raw.userId;
    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    }
    domainEntity.lastReadMessageId = raw.lastReadMessageId ?? null;
    domainEntity.lastReadAt = raw.lastReadAt;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: ConversationRead): ConversationReadEntity {
    const persistenceEntity = new ConversationReadEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.conversationId = domainEntity.conversationId;
    persistenceEntity.userId = domainEntity.userId;
    persistenceEntity.lastReadMessageId = domainEntity.lastReadMessageId;
    persistenceEntity.lastReadAt = domainEntity.lastReadAt;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
