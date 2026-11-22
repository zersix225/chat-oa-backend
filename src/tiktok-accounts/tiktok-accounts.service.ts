import {
  // common
  Injectable,
} from '@nestjs/common';
import { CreateTiktokAccountDto } from './dto/create-tiktok-account.dto';
import { UpdateTiktokAccountDto } from './dto/update-tiktok-account.dto';
import { TiktokAccountRepository } from './infrastructure/persistence/tiktok-account.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { TiktokAccount } from './domain/tiktok-account';

@Injectable()
export class TiktokAccountsService {
  constructor(
    // Dependencies here
    private readonly tiktokAccountRepository: TiktokAccountRepository,
  ) {}

  async create(createTiktokAccountDto: CreateTiktokAccountDto) {
    // Do not remove comment below.
    // <creating-property />

    return this.tiktokAccountRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      refreshTokenExpiresAt: createTiktokAccountDto.refreshTokenExpiresAt,

      refreshToken: createTiktokAccountDto.refreshToken,

      accessTokenExpiresAt: createTiktokAccountDto.accessTokenExpiresAt,

      accessToken: createTiktokAccountDto.accessToken,

      scope: createTiktokAccountDto.scope,

      avatarUrl: createTiktokAccountDto.avatarUrl,

      displayName: createTiktokAccountDto.displayName,

      openId: createTiktokAccountDto.openId,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.tiktokAccountRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: TiktokAccount['id']) {
    return this.tiktokAccountRepository.findById(id);
  }

  findByOpenId(openId: TiktokAccount['openId']) {
    return this.tiktokAccountRepository.findByOpenId(openId);
  }

  async upsertByOpenId(data: CreateTiktokAccountDto): Promise<TiktokAccount> {
    const existing = await this.tiktokAccountRepository.findByOpenId(
      data.openId,
    );
    if (!existing) return this.create(data);
    const updated = await this.update(existing.id, data);
    return updated ?? existing;
  }

  findByIds(ids: TiktokAccount['id'][]) {
    return this.tiktokAccountRepository.findByIds(ids);
  }

  async update(
    id: TiktokAccount['id'],

    updateTiktokAccountDto: UpdateTiktokAccountDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    return this.tiktokAccountRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      refreshTokenExpiresAt: updateTiktokAccountDto.refreshTokenExpiresAt,

      refreshToken: updateTiktokAccountDto.refreshToken,

      accessTokenExpiresAt: updateTiktokAccountDto.accessTokenExpiresAt,

      accessToken: updateTiktokAccountDto.accessToken,

      scope: updateTiktokAccountDto.scope,

      avatarUrl: updateTiktokAccountDto.avatarUrl,

      displayName: updateTiktokAccountDto.displayName,

      openId: updateTiktokAccountDto.openId,
    });
  }

  remove(id: TiktokAccount['id']) {
    return this.tiktokAccountRepository.remove(id);
  }
}
