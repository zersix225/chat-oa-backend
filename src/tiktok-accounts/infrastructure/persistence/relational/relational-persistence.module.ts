import { Module } from '@nestjs/common';
import { TiktokAccountRepository } from '../tiktok-account.repository';
import { TiktokAccountRelationalRepository } from './repositories/tiktok-account.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiktokAccountEntity } from './entities/tiktok-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TiktokAccountEntity])],
  providers: [
    {
      provide: TiktokAccountRepository,
      useClass: TiktokAccountRelationalRepository,
    },
  ],
  exports: [TiktokAccountRepository],
})
export class RelationalTiktokAccountPersistenceModule {}
