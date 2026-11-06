import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactRepository } from './infrastructure/persistence/contact.repository';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { Contact } from './domain/contact';

@Injectable()
export class ContactsService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async create(createLineContactDto: CreateContactDto) {
    return this.contactRepository.create({
      pictureUrl: createLineContactDto.pictureUrl,
      displayName: createLineContactDto.displayName,
      customerId: createLineContactDto.customerId,
      contactPlatform: createLineContactDto.contactPlatform,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.contactRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Contact['id']) {
    return this.contactRepository.findById(id);
  }

  findLineUserId(customerId: Contact['customerId']) {
    return this.contactRepository.findByLineUserId(customerId);
  }

  async upsertByLineUserId(data: CreateContactDto): Promise<Contact> {
    const existing = await this.contactRepository.findByLineUserId(
      data.customerId,
    );
    if (existing) {
      const updated = await this.contactRepository.update(existing.id, {
        displayName: data.displayName,
        pictureUrl: data.pictureUrl ?? null,
      });
      if (!updated) {
        throw new NotFoundException(
          `LineContact ${existing.id} not found during update`,
        );
      }
      return updated;
    }
    return this.contactRepository.create(data);
  }

  findByIds(ids: Contact['id'][]) {
    return this.contactRepository.findByIds(ids);
  }

  async update(id: Contact['id'], updateLineContactDto: UpdateContactDto) {
    return this.contactRepository.update(id, {
      pictureUrl: updateLineContactDto.pictureUrl,
      displayName: updateLineContactDto.displayName,
      customerId: updateLineContactDto.customerId,
    });
  }

  remove(id: Contact['id']) {
    return this.contactRepository.remove(id);
  }
}
