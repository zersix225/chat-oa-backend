import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { TiktokAccount } from '../../domain/tiktok-account';

export abstract class TiktokAccountRepository {
  abstract create(
    data: Omit<TiktokAccount, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<TiktokAccount>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<TiktokAccount[]>;

  abstract findById(
    id: TiktokAccount['id'],
  ): Promise<NullableType<TiktokAccount>>;

  abstract findByOpenId(
    openId: TiktokAccount['openId'],
  ): Promise<NullableType<TiktokAccount>>;

  abstract findByIds(ids: TiktokAccount['id'][]): Promise<TiktokAccount[]>;

  abstract update(
    id: TiktokAccount['id'],
    payload: DeepPartial<TiktokAccount>,
  ): Promise<TiktokAccount | null>;

  abstract remove(id: TiktokAccount['id']): Promise<void>;
}
