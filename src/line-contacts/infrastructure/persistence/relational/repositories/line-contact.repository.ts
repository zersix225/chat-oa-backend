import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LineContactEntity } from '../entities/line-contact.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { LineContact } from '../../../../domain/line-contact';
import { LineContactRepository } from '../../line-contact.repository';
import { LineContactMapper } from '../mappers/line-contact.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LineContactRelationalRepository implements LineContactRepository {
  constructor(
    @InjectRepository(LineContactEntity)
    private readonly lineContactRepository: Repository<LineContactEntity>,
  ) {}

  async create(data: LineContact): Promise<LineContact> {
    const persistenceModel = LineContactMapper.toPersistence(data);
    const newEntity = await this.lineContactRepository.save(
      this.lineContactRepository.create(persistenceModel),
    );
    return LineContactMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LineContact[]> {
    const entities = await this.lineContactRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => LineContactMapper.toDomain(entity));
  }

  async findById(id: LineContact['id']): Promise<NullableType<LineContact>> {
    const entity = await this.lineContactRepository.findOne({
      where: { id },
    });

    return entity ? LineContactMapper.toDomain(entity) : null;
  }

  async findByLineUserId(
    lineUserId: string,
  ): Promise<NullableType<LineContact>> {
    const entity = await this.lineContactRepository.findOne({
      where: { lineUserId },
    });
    return entity ? LineContactMapper.toDomain(entity) : null;
  }

  async findByIds(ids: LineContact['id'][]): Promise<LineContact[]> {
    const entities = await this.lineContactRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => LineContactMapper.toDomain(entity));
  }

  async update(
    id: LineContact['id'],
    payload: Partial<LineContact>,
  ): Promise<LineContact> {
    const entity = await this.lineContactRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.lineContactRepository.save(
      this.lineContactRepository.create(
        LineContactMapper.toPersistence({
          ...LineContactMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return LineContactMapper.toDomain(updatedEntity);
  }

  async remove(id: LineContact['id']): Promise<void> {
    await this.lineContactRepository.softDelete(id);
  }
}
