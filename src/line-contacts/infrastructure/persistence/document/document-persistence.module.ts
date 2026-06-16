import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LineContactSchema,
  LineContactSchemaClass,
} from './entities/line-contact.schema';
import { LineContactRepository } from '../line-contact.repository';
import { LineContactDocumentRepository } from './repositories/line-contact.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LineContactSchemaClass.name, schema: LineContactSchema },
    ]),
  ],
  providers: [
    {
      provide: LineContactRepository,
      useClass: LineContactDocumentRepository,
    },
  ],
  exports: [LineContactRepository],
})
export class DocumentLineContactPersistenceModule {}
