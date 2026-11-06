import {
  Injectable,
  BadGatewayException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MessagesService } from '@/messages/messages.service';
import {
  AttachmentDto,
  FacebookWebhookDto,
  MessagingEventDto,
} from '@/webhooks/facebook/dto/webhook.dto';
import {
  MessagePlatform,
  MessageType,
  SenderType,
} from '@/messages/domain/message';
import { FileStorageService } from '@/files/file-storage.service';
import { getExtension, kindFromExtension } from '@/files/file-types';
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
    private readonly fileStorage: FileStorageService,
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
    const text = event.message?.text;
    const attachments = event.message?.attachments ?? [];
    if (!text && attachments.length === 0) return;

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

    const base = {
      adminId: null,
      conversationId: conversation.id,
      messagePlatform: MessagePlatform.FACEBOOK,
      senderType: SenderType.USER,
      timestamp: new Date(event.timestamp),
    };

    if (text) {
      await this.messagesService.create({ ...base, content: text });
    }
    // One stored message per attachment.
    for (const attachment of attachments) {
      const incoming = await this.toIncomingAttachment(attachment);
      if (incoming) {
        await this.messagesService.create({ ...base, ...incoming });
      }
    }
  }

  private async toIncomingAttachment(attachment: AttachmentDto): Promise<{
    content: string;
    messageType: MessageType;
    fileId: string | null;
  } | null> {
    const typeMap: Record<string, MessageType> = {
      image: MessageType.IMAGE,
      video: MessageType.VIDEO,
      audio: MessageType.AUDIO,
      file: MessageType.FILE,
    };
    const messageType = typeMap[attachment.type];
    const url = attachment.payload?.url;
    // Skip link previews (fallback), templates, locations, etc.
    if (!messageType || !url) return null;

    let fileId: string | null = null;
    try {
      fileId = (await this.fileStorage.storeFromUrl(url)).id;
    } catch (error) {
      // Still save the message so the admin knows something was sent.
      this.logger.warn(
        `Could not store Facebook attachment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return {
      content:
        messageType === MessageType.FILE
          ? (attachment.payload?.title ??
            decodeURIComponent(new URL(url).pathname.split('/').pop() ?? ''))
          : '',
      messageType,
      fileId,
    };
  }

  /** Send text and/or a file (fileId from POST /api/v1/files/upload). */
  async pushMessage(payload: FacebookPushMessageDto) {
    const text = payload.message?.text;
    if (!text && !payload.fileId) {
      throw new UnprocessableEntityException(
        'message.text or fileId is required',
      );
    }

    const file = payload.fileId
      ? await this.fileStorage.findById(payload.fileId)
      : null;
    if (payload.fileId && !file) {
      throw new NotFoundException(`File ${payload.fileId} not found`);
    }

    const base = {
      conversationId: payload.conversationId,
      messagePlatform: MessagePlatform.FACEBOOK,
      adminId: payload.adminId,
      senderType: SenderType.ADMIN,
    };
    const results: unknown[] = [];

    if (text) {
      results.push(await this.sendToFacebook(payload, { text }));
      await this.messagesService.create({
        ...base,
        content: text,
        timestamp: new Date(),
      });
    }

    if (file) {
      const kind = kindFromExtension(getExtension(file.path));
      results.push(
        await this.sendToFacebook(payload, {
          attachment: {
            type: kind,
            payload: {
              url: await this.fileStorage.getPublicUrl(file),
              is_reusable: true,
            },
          },
        }),
      );
      await this.messagesService.create({
        ...base,
        // Original file name for every kind, so logs can show it.
        content: payload.fileName?.trim() ?? '',
        messageType: kind as MessageType,
        fileId: file.id,
        timestamp: new Date(),
      });
    }

    return results.length === 1 ? results[0] : results;
  }

  private async sendToFacebook(
    payload: FacebookPushMessageDto,
    message: Record<string, unknown>,
  ): Promise<unknown> {
    const pageId = this.configService.get('facebook.pageId', { infer: true });
    const res = await firstValueFrom(
      this.httpService.post<unknown>(
        `${this.url}${pageId}/messages`,
        {
          recipient: payload.recipient,
          messaging_type: payload.messaging_type,
          message,
        },
        {
          params: {
            access_token: this.configService.get('facebook.accessToken', {
              infer: true,
            }),
          },
        },
      ),
    ).catch((error: unknown) => {
      // Pass Facebook's reason to the client instead of a bare 500.
      const fb = (
        error as {
          response?: {
            data?: { error?: { message?: string; error_user_msg?: string } };
          };
        }
      ).response?.data?.error;
      const reason =
        fb?.error_user_msg ??
        fb?.message ??
        (error instanceof Error ? error.message : String(error));
      this.logger.warn(`Facebook send failed: ${reason}`);
      throw new BadGatewayException(`Facebook rejected the message: ${reason}`);
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
