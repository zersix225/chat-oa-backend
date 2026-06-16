import { LineContact } from '../../../../domain/line-contact';

import { LineContactSchemaClass } from '../entities/line-contact.schema';

export class LineContactMapper {
  public static toDomain(raw: LineContactSchemaClass): LineContact {
    const domainEntity = new LineContact();
    domainEntity.pictureUrl = raw.pictureUrl;

    domainEntity.displayName = raw.displayName;

    domainEntity.lineUserId = raw.lineUserId;

    domainEntity.id = raw._id.toString();
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  public static toPersistence(
    domainEntity: LineContact,
  ): LineContactSchemaClass {
    const persistenceSchema = new LineContactSchemaClass();
    persistenceSchema.pictureUrl = domainEntity.pictureUrl;

    persistenceSchema.displayName = domainEntity.displayName;

    persistenceSchema.lineUserId = domainEntity.lineUserId;

    if (domainEntity.id) {
      persistenceSchema._id = domainEntity.id;
    }
    persistenceSchema.createdAt = domainEntity.createdAt;
    persistenceSchema.updatedAt = domainEntity.updatedAt;

    return persistenceSchema;
  }
}
