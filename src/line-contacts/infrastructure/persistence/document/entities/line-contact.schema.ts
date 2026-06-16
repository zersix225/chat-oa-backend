import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';

export type LineContactSchemaDocument =
  HydratedDocument<LineContactSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class LineContactSchemaClass extends EntityDocumentHelper {
  @Prop({
    type: String,
  })
  pictureUrl?: string | null;

  @Prop({
    type: String,
  })
  displayName: string;

  @Prop({
    type: String,
  })
  lineUserId: string;

  @Prop({ default: now })
  createdAt: Date;

  @Prop({ default: now })
  updatedAt: Date;
}

export const LineContactSchema = SchemaFactory.createForClass(
  LineContactSchemaClass,
);
