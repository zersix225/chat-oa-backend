import { TiktokAccount } from '../../../../domain/tiktok-account';

import { TiktokAccountEntity } from '../entities/tiktok-account.entity';

export class TiktokAccountMapper {
  static toDomain(raw: TiktokAccountEntity): TiktokAccount {
    const domainEntity = new TiktokAccount();
    domainEntity.refreshTokenExpiresAt = raw.refreshTokenExpiresAt;

    domainEntity.refreshToken = raw.refreshToken;

    domainEntity.accessTokenExpiresAt = raw.accessTokenExpiresAt;

    domainEntity.accessToken = raw.accessToken;

    domainEntity.scope = raw.scope;

    domainEntity.avatarUrl = raw.avatarUrl;

    domainEntity.displayName = raw.displayName;

    domainEntity.openId = raw.openId;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: TiktokAccount): TiktokAccountEntity {
    const persistenceEntity = new TiktokAccountEntity();
    persistenceEntity.refreshTokenExpiresAt =
      domainEntity.refreshTokenExpiresAt;

    persistenceEntity.refreshToken = domainEntity.refreshToken;

    persistenceEntity.accessTokenExpiresAt = domainEntity.accessTokenExpiresAt;

    persistenceEntity.accessToken = domainEntity.accessToken;

    persistenceEntity.scope = domainEntity.scope;

    persistenceEntity.avatarUrl = domainEntity.avatarUrl;

    persistenceEntity.displayName = domainEntity.displayName;

    persistenceEntity.openId = domainEntity.openId;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
