import { DeepPartial } from '@/utils/types/deep-partial.type';
import { NullableType } from '@/utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { Contact } from '../../domain/contact';

export abstract class ContactRepository {
  abstract create(
    data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Contact>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Contact[]>;

  abstract findById(id: Contact['id']): Promise<NullableType<Contact>>;

  abstract findByLineUserId(lineUserId: string): Promise<NullableType<Contact>>;

  abstract findByIds(ids: Contact['id'][]): Promise<Contact[]>;

  abstract update(
    id: Contact['id'],
    payload: DeepPartial<Contact>,
  ): Promise<Contact | null>;

  abstract remove(id: Contact['id']): Promise<void>;
}
