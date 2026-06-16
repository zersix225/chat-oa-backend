import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import lineConfig from './config/line.config';
import { LineController } from './line.controller';
import { LineService } from './line.service';
import { middleware } from '@line/bot-sdk';
import { AllConfigType } from '@/config/config.type';
import { MessagesModule } from '@/messages/messages.module';
import { LineContactsModule } from '@/line-contacts/line-contacts.module';
import * as express from 'express';

@Module({
  imports: [
    ConfigModule.forFeature(lineConfig),
    MessagesModule,
    LineContactsModule,
  ],
  controllers: [LineController],
  providers: [LineService],
})
export class LineModule implements NestModule {
  constructor(private readonly config: ConfigService<AllConfigType>) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(express.json())
      .forRoutes({ path: '/webhooks/line/push', method: RequestMethod.POST });

    consumer
      .apply(
        middleware({
          channelSecret:
            this.config.get('line.channelSecret', { infer: true }) ?? '',
        }),
      )
      .forRoutes({ path: '/webhooks/line', method: RequestMethod.POST });
  }
}
