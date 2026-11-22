import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { TiktokAccountsService } from './tiktok-accounts.service';
import { TiktokAccountsController } from './tiktok-accounts.controller';
import { RelationalTiktokAccountPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalTiktokAccountPersistenceModule,
  ],
  controllers: [TiktokAccountsController],
  providers: [TiktokAccountsService],
  exports: [TiktokAccountsService, RelationalTiktokAccountPersistenceModule],
})
export class TiktokAccountsModule {}
