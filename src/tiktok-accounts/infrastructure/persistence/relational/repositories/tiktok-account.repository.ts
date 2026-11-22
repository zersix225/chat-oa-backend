import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TiktokAccountEntity } from '../entities/tiktok-account.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { TiktokAccount } from '../../../../domain/tiktok-account';
import { TiktokAccountRepository } from '../../tiktok-account.repository';
import { TiktokAccountMapper } from '../mappers/tiktok-account.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class TiktokAccountRelationalRepository implements TiktokAccountRepository {
  constructor(
    @InjectRepository(TiktokAccountEntity)
    private readonly tiktokAccountRepository: Repository<TiktokAccountEntity>,
  ) {}

  async create(data: TiktokAccount): Promise<TiktokAccount> {
    const persistenceModel = TiktokAccountMapper.toPersistence(data);
    const newEntity = await this.tiktokAccountRepository.save(
      this.tiktokAccountRepository.create(persistenceModel),
    );
    return TiktokAccountMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<TiktokAccount[]> {
    const entities = await this.tiktokAccountRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => TiktokAccountMapper.toDomain(entity));
  }

  async findById(
    id: TiktokAccount['id'],
  ): Promise<NullableType<TiktokAccount>> {
    const entity = await this.tiktokAccountRepository.findOne({
      where: { id },
    });

    return entity ? TiktokAccountMapper.toDomain(entity) : null;
  }

  async findByOpenId(
    openId: TiktokAccount['openId'],
  ): Promise<NullableType<TiktokAccount>> {
    const entity = await this.tiktokAccountRepository.findOne({
      where: { openId },
    });

    return entity ? TiktokAccountMapper.toDomain(entity) : null;
  }

  async findByIds(ids: TiktokAccount['id'][]): Promise<TiktokAccount[]> {
    const entities = await this.tiktokAccountRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => TiktokAccountMapper.toDomain(entity));
  }

  async update(
    id: TiktokAccount['id'],
    payload: Partial<TiktokAccount>,
  ): Promise<TiktokAccount> {
    const entity = await this.tiktokAccountRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.tiktokAccountRepository.save(
      this.tiktokAccountRepository.create(
        TiktokAccountMapper.toPersistence({
          ...TiktokAccountMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return TiktokAccountMapper.toDomain(updatedEntity);
  }

  async remove(id: TiktokAccount['id']): Promise<void> {
    await this.tiktokAccountRepository.delete(id);
  }
}
