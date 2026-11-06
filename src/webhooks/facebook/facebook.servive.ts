import { Injectable, Logger } from '@nestjs/common';
import { MessagesService } from '@/messages/messages.service';
import {
  FacebookWebhookDto,
  MessagingEventDto,
} from '@/webhooks/facebook/dto/webhook.dto';
import { MessagePlatform, SenderType } from '@/messages/domain/message';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ProfileDto } from '@/webhooks/facebook/dto/profile.dto';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import { ContactPlatform } from '@/contacts/domain/contact';
import { ContactsService } from '@/contacts/contacts.service';
import { FacebookPushMessageDto } from '@/webhooks/facebook/dto/push-message.dto';
import { ConversationsService } from '@/conversations/conversations.service';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);
  private readonly url = 'https://graph.facebook.com/v25.0/';

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly messagesService: MessagesService,
    private readonly contactsService: ContactsService,
    private readonly conversationsService: ConversationsService,
    private readonly httpService: HttpService,
  ) {}

  async handleWebhook(event: FacebookWebhookDto) {
    if (event.object === 'page') {
      for (const pageEntry of event.entry) {
        for (const messagingEvent of pageEntry.messaging) {
          await this.handleMessage(messagingEvent);
        }
      }
    }
    return event;
  }

  private async handleMessage(event: MessagingEventDto) {
    if (!event.message?.text) return;

    const message = event.message.text;
    const customerId = event.sender.id;

    let contact = await this.contactsService.findLineUserId(customerId);

    if (!contact) {
      const fetchData = await firstValueFrom(this.fetchUserProfile(customerId));
      contact = await this.contactsService.create({
        customerId: fetchData.data.id,
        displayName: `${fetchData.data.first_name} ${fetchData.data.last_name}`,
        pictureUrl: fetchData.data.profile_pic,
        contactPlatform: ContactPlatform.FACEBOOK,
      });
    }

    let conversation = await this.conversationsService.findByContactId(
      contact.id,
    );

    if (!conversation) {
      conversation = await this.conversationsService.create({
        contactId: contact.id,
      });
    }

    await this.messagesService.create({
      content: message,
      adminId: null,
      conversationId: conversation.id,
      messagePlatform: MessagePlatform.FACEBOOK,
      senderType: SenderType.USER,
      timestamp: new Date(event.timestamp),
    });
  }

  async pushMessage(payload: FacebookPushMessageDto) {
    const pageId = this.configService.get('facebook.pageId', { infer: true });

    const res = await firstValueFrom(
      this.httpService.post(`${this.url}${pageId}/messages`, payload, {
        params: {
          access_token: this.configService.get('facebook.accessToken', {
            infer: true,
          }),
        },
      }),
    );

    await this.messagesService.create({
      content: payload.message.text,
      conversationId: payload.conversationId,
      messagePlatform: MessagePlatform.FACEBOOK,
      adminId: payload.adminId,
      senderType: SenderType.ADMIN,
      timestamp: new Date(),
    });

    return res.data;
  }

  private fetchUserProfile(
    senderId: string,
  ): Observable<AxiosResponse<ProfileDto>> {
    return this.httpService.get(`${this.url}${senderId}`, {
      params: {
        access_token: this.configService.get('facebook.accessToken', {
          infer: true,
        }),
        fields: 'first_name, last_name, profile_pic',
      },
    });
  }
}
