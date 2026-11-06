import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LineBotClient, webhook } from '@line/bot-sdk';
import { AllConfigType } from '@/config/config.type';
import { MessagesService } from '@/messages/messages.service';
import { MessagePlatform, SenderType } from '@/messages/domain/message';
import { ContactsService } from '@/contacts/contacts.service';
import { ContactPlatform } from '@/contacts/domain/contact';
import { ConversationsService } from '@/conversations/conversations.service';
import { PushMessageDto } from '@/webhooks/line/dto/push-message.dto';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly client: LineBotClient;
  private readonly channelName: string;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly messagesService: MessagesService,
    private readonly contactsService: ContactsService,
    private readonly conversationsService: ConversationsService,
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
    await Promise.all(events.map((event) => this.handleMessage(event)));
  }

  async pushMessage(payload: PushMessageDto) {
    await this.client.pushMessage({
      to: payload.customerId,
      messages: [{ type: 'text', text: payload.message }],
    });
    console.log(payload.adminId);
    await this.messagesService.create({
      content: payload.message,
      conversationId: payload.conversationId,
      messagePlatform: MessagePlatform.LINE,
      adminId: payload.adminId,
      senderType: SenderType.ADMIN,
      timestamp: new Date(),
    });
  }

  private async handleMessage(event: webhook.Event) {
    const customerId = event.source?.userId;
    if (!customerId) return;

    let contact = await this.contactsService.findLineUserId(customerId);

    const isMessageEvent =
      event.type === 'message' && event.message.type === 'text';

    if (!contact) {
      const profile = await this.client.getProfile(customerId);
      contact = await this.contactsService.create({
        customerId: customerId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl ?? null,
        contactPlatform: ContactPlatform.LINE,
      });
      if (isMessageEvent && event.replyToken) {
        await this.client.replyMessage({
          replyToken: event.replyToken ?? '',
          messages: [
            {
              type: 'text',
              text: this.buildWelcomeMessage(profile.displayName),
            },
          ],
        });
      }
    }

    let conversation = await this.conversationsService.findByContactId(
      contact.id,
    );

    if (!conversation) {
      this.logger.log('!conversation not found');
      conversation = await this.conversationsService.create({
        contactId: contact.id,
      });
    }

    if (event.type === 'message' && event.message.type === 'text') {
      await this.messagesService.create({
        conversationId: conversation.id,
        adminId: null,
        content: event.message.text,
        messagePlatform: MessagePlatform.LINE,
        senderType: SenderType.USER,
        timestamp: new Date(event.timestamp),
      });
    }
  }

  private buildWelcomeMessage(displayName: string): string {
    return `สวัสดีค่ะคุณ ${displayName} ยินดีต้อนรับสู่ ${this.channelName} ค่ะ 😊`;
  }
}
