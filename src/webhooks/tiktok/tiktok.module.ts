import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import tiktokConfig from '@/webhooks/tiktok/config/tiktok.config';
import { TiktokController } from '@/webhooks/tiktok/tiktok.controller';
import { TiktokService } from '@/webhooks/tiktok/tiktok.service';

@Module({
  imports: [ConfigModule.forFeature(tiktokConfig)],
  controllers: [TiktokController],
  providers: [TiktokService],
  exports: [TiktokService],
})
export class TiktokModule {}
