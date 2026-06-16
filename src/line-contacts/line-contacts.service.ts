import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLineContactDto } from './dto/create-line-contact.dto';
import { UpdateLineContactDto } from './dto/update-line-contact.dto';
import { LineContactRepository } from './infrastructure/persistence/line-contact.repository';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { LineContact } from './domain/line-contact';

@Injectable()
export class LineContactsService {
  constructor(private readonly lineContactRepository: LineContactRepository) {}

  async create(createLineContactDto: CreateLineContactDto) {
    return this.lineContactRepository.create({
      pictureUrl: createLineContactDto.pictureUrl,
      displayName: createLineContactDto.displayName,
      lineUserId: createLineContactDto.lineUserId,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.lineContactRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: LineContact['id']) {
    return this.lineContactRepository.findById(id);
  }

  async upsertByLineUserId(data: {
    lineUserId: string;
    displayName: string;
    pictureUrl?: string | null;
  }): Promise<LineContact> {
    const existing = await this.lineContactRepository.findByLineUserId(
      data.lineUserId,
    );
    if (existing) {
      const updated = await this.lineContactRepository.update(existing.id, {
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
    return this.lineContactRepository.create(data);
  }

  findByIds(ids: LineContact['id'][]) {
    return this.lineContactRepository.findByIds(ids);
  }

  async update(
    id: LineContact['id'],
    updateLineContactDto: UpdateLineContactDto,
  ) {
    return this.lineContactRepository.update(id, {
      pictureUrl: updateLineContactDto.pictureUrl,
      displayName: updateLineContactDto.displayName,
      lineUserId: updateLineContactDto.lineUserId,
    });
  }

  remove(id: LineContact['id']) {
    return this.lineContactRepository.remove(id);
  }
}
