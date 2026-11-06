import { Contact } from '@/contacts/domain/contact';
import { ContactEntity } from '../entities/contact.entity';

export class ContactMapper {
  static toDomain(raw: ContactEntity): Contact {
    const domainEntity = new Contact();
    domainEntity.pictureUrl = raw.pictureUrl;
    domainEntity.displayName = raw.displayName;
    domainEntity.customerId = raw.customerId;
    domainEntity.contactPlatform = raw.contactPlatform;
    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Contact): ContactEntity {
    const persistenceEntity = new ContactEntity();
    persistenceEntity.pictureUrl = domainEntity.pictureUrl;
    persistenceEntity.displayName = domainEntity.displayName;
    persistenceEntity.customerId = domainEntity.customerId;
    persistenceEntity.contactPlatform = domainEntity.contactPlatform;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
