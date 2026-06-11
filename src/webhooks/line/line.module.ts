import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import lineConfig from './config/line.config';
import { LineController } from './line.controller';
import { LineService } from './line.service';
import { middleware } from '@line/bot-sdk';
import { AllConfigType } from '@/config/config.type';
import { MessagesModule } from '@/messages/messages.module';

@Module({
  imports: [ConfigModule.forFeature(lineConfig), MessagesModule],
  controllers: [LineController],
  providers: [LineService],
})
export class LineModule implements NestModule {
  constructor(private readonly config: ConfigService<AllConfigType>) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        middleware({
          channelSecret:
            this.config.get('line.channelSecret', { infer: true }) ?? '',
        }),
      )
      .forRoutes('/webhooks/line');
  }
}
