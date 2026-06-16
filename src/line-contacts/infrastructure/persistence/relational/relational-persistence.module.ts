import { Module } from '@nestjs/common';
import { LineContactRepository } from '../line-contact.repository';
import { LineContactRelationalRepository } from './repositories/line-contact.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LineContactEntity } from './entities/line-contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LineContactEntity])],
  providers: [
    {
      provide: LineContactRepository,
      useClass: LineContactRelationalRepository,
    },
  ],
  exports: [LineContactRepository],
})
export class RelationalLineContactPersistenceModule {}
