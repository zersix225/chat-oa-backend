import { Injectable } from '@nestjs/common';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LineContactSchemaClass } from '../entities/line-contact.schema';
import { LineContactRepository } from '../../line-contact.repository';
import { LineContact } from '../../../../domain/line-contact';
import { LineContactMapper } from '../mappers/line-contact.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LineContactDocumentRepository implements LineContactRepository {
  constructor(
    @InjectModel(LineContactSchemaClass.name)
    private readonly lineContactModel: Model<LineContactSchemaClass>,
  ) {}

  async create(data: LineContact): Promise<LineContact> {
    const persistenceModel = LineContactMapper.toPersistence(data);
    const createdEntity = new this.lineContactModel(persistenceModel);
    const entityObject = await createdEntity.save();
    return LineContactMapper.toDomain(entityObject);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LineContact[]> {
    const entityObjects = await this.lineContactModel
      .find()
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .limit(paginationOptions.limit);

    return entityObjects.map((entityObject) =>
      LineContactMapper.toDomain(entityObject),
    );
  }

  async findById(id: LineContact['id']): Promise<NullableType<LineContact>> {
    const entityObject = await this.lineContactModel.findById(id);
    return entityObject ? LineContactMapper.toDomain(entityObject) : null;
  }

  async findByLineUserId(
    lineUserId: string,
  ): Promise<NullableType<LineContact>> {
    const entityObject = await this.lineContactModel.findOne({ lineUserId });
    return entityObject ? LineContactMapper.toDomain(entityObject) : null;
  }

  async findByIds(ids: LineContact['id'][]): Promise<LineContact[]> {
    const entityObjects = await this.lineContactModel.find({
      _id: { $in: ids },
    });
    return entityObjects.map((entityObject) =>
      LineContactMapper.toDomain(entityObject),
    );
  }

  async update(
    id: LineContact['id'],
    payload: Partial<LineContact>,
  ): Promise<NullableType<LineContact>> {
    const clonedPayload = { ...payload };
    delete clonedPayload.id;

    const filter = { _id: id.toString() };
    const entity = await this.lineContactModel.findOne(filter);

    if (!entity) {
      throw new Error('Record not found');
    }

    const entityObject = await this.lineContactModel.findOneAndUpdate(
      filter,
      LineContactMapper.toPersistence({
        ...LineContactMapper.toDomain(entity),
        ...clonedPayload,
      }),
      { new: true },
    );

    return entityObject ? LineContactMapper.toDomain(entityObject) : null;
  }

  async remove(id: LineContact['id']): Promise<void> {
    await this.lineContactModel.deleteOne({ _id: id });
  }
}
