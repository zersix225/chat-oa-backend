import { DeepPartial } from '@/utils/types/deep-partial.type';
import { NullableType } from '@/utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { LineContact } from '../../domain/line-contact';

export abstract class LineContactRepository {
  abstract create(
    data: Omit<LineContact, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LineContact>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LineContact[]>;

  abstract findById(id: LineContact['id']): Promise<NullableType<LineContact>>;

  abstract findByLineUserId(
    lineUserId: string,
  ): Promise<NullableType<LineContact>>;

  abstract findByIds(ids: LineContact['id'][]): Promise<LineContact[]>;

  abstract update(
    id: LineContact['id'],
    payload: DeepPartial<LineContact>,
  ): Promise<LineContact | null>;

  abstract remove(id: LineContact['id']): Promise<void>;
}
