import { LineContact } from '../../../../domain/line-contact';

import { LineContactEntity } from '../entities/line-contact.entity';

export class LineContactMapper {
  static toDomain(raw: LineContactEntity): LineContact {
    const domainEntity = new LineContact();
    domainEntity.pictureUrl = raw.pictureUrl;

    domainEntity.displayName = raw.displayName;

    domainEntity.lineUserId = raw.lineUserId;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: LineContact): LineContactEntity {
    const persistenceEntity = new LineContactEntity();
    persistenceEntity.pictureUrl = domainEntity.pictureUrl;

    persistenceEntity.displayName = domainEntity.displayName;

    persistenceEntity.lineUserId = domainEntity.lineUserId;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
