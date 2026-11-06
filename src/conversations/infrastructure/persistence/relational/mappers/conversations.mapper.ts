import { Conversations } from '../../../../domain/conversations';
import { ConversationsEntity } from '../entities/conversations.entity';
import { ContactMapper } from '@/contacts/infrastructure/persistence/relational/mappers/contact.mapper';
import { UserMapper } from '@/users/infrastructure/persistence/relational/mappers/user.mapper';

export class ConversationsMapper {
  static toDomain(raw: ConversationsEntity): Conversations {
    const domainEntity = new Conversations();
    domainEntity.id = raw.id;
    domainEntity.contact = raw.contact
      ? ContactMapper.toDomain(raw.contact)
      : undefined;
    domainEntity.contactId = raw.contactId;
    domainEntity.lastMessage = raw.lastMessage;
    domainEntity.messages = raw.messages;
    domainEntity.lastMessageId = raw.lastMessageId;
    domainEntity.assigneeId = raw.assigneeId ?? null;
    domainEntity.assignee = raw.assignee
      ? UserMapper.toDomain(raw.assignee)
      : null;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Conversations): ConversationsEntity {
    const persistenceEntity = new ConversationsEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.contactId = domainEntity.contactId;
    persistenceEntity.lastMessageId = domainEntity.lastMessageId;
    persistenceEntity.assigneeId = domainEntity.assigneeId ?? null;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
