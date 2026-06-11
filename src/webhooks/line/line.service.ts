import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LineBotClient, webhook } from '@line/bot-sdk';
import { AllConfigType } from '@/config/config.type';
import { MessagesService } from '@/messages/messages.service';
import { MessagePlatform } from '@/messages/domain/message';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly client: LineBotClient;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly messagesService: MessagesService,
  ) {
    this.client = LineBotClient.fromChannelAccessToken({
      channelAccessToken:
        this.configService.get('line.channelAccessToken', { infer: true }) ??
        '',
    });
  }

  async handleWebhook(events: webhook.Event[]) {
    await Promise.all(events.map((event) => this.handleEvent(event)));
    return { status: 'ok' };
  }

  private async handleEvent(event: webhook.Event) {
    this.logger.log(
      `Received event type: ${event.type} from userId: ${event.source?.userId}`,
    );
    this.logger.log(event);

    const lineName = await this.client.getProfile(event.source?.userId ?? '');
    const msgRes: string = `สวัสดีค่ะคุณ ${lineName.displayName} ยินดีต้อนรับสู่ PCM ค่ะ 😊ร้านเราจำหน่าย [สินค้า/บริการ] ดูแลผิวหน้าและผิวกายอย่างปลอดภัย`;

    if (event.type === 'message' && event.message.type === 'text') {
      const msgChat = event.message.text;
      const senderId = event.source?.userId ?? '';
      const timestamp = event.timestamp;

      await this.messagesService.create({
        content: msgChat,
        senderId,
        messagePlatform: MessagePlatform.LINE,
        timestamp: new Date(timestamp),
      });

      await this.client.replyMessage({
        replyToken: event.replyToken ?? '',
        messages: [{ type: 'text', text: msgRes }],
      });
    }
  }
}
