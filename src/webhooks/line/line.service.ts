import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LineBotClient, webhook } from '@line/bot-sdk';
import { AllConfigType } from '@/config/config.type';
import { MessagesService } from '@/messages/messages.service';
import { MessagePlatform } from '@/messages/domain/message';
import { LineContactsService } from '@/line-contacts/line-contacts.service';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly client: LineBotClient;
  private readonly channelName: string;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly messagesService: MessagesService,
    private readonly lineContactsService: LineContactsService,
  ) {
    this.client = LineBotClient.fromChannelAccessToken({
      channelAccessToken:
        this.configService.get('line.channelAccessToken', { infer: true }) ??
        '',
    });
    this.channelName =
      this.configService.get('line.channelName', { infer: true }) ?? '';
  }

  async handleWebhook(events: webhook.Event[]) {
    await Promise.all(events.map((event) => this.handleEvent(event)));
    return { status: 'ok' };
  }

  async pushMessage(message: string, lineUserId: string) {
    try {
      await this.client.pushMessage({
        to: lineUserId,
        messages: [{ type: 'text', text: message }],
      });
    } catch (error) {
      this.logger.error('pushMessage failed', error);
      throw error;
    }
  }

  private async handleEvent(event: webhook.Event) {
    const userId = event.source?.userId;
    if (!userId) return;

    const profile = await this.client.getProfile(userId);

    await this.lineContactsService.upsertByLineUserId({
      lineUserId: userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl ?? null,
    });

    if (event.type === 'message' && event.message.type === 'text') {
      await this.messagesService.create({
        content: event.message.text,
        senderId: userId,
        messagePlatform: MessagePlatform.LINE,
        timestamp: new Date(event.timestamp),
      });

      await this.client.replyMessage({
        replyToken: event.replyToken ?? '',
        messages: [
          { type: 'text', text: this.buildWelcomeMessage(profile.displayName) },
        ],
      });
    }
  }

  private buildWelcomeMessage(displayName: string): string {
    return `สวัสดีค่ะคุณ ${displayName} ยินดีต้อนรับสู่ ${this.channelName} ค่ะ 😊`;
  }
}
