import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HTTPFetchError,
  LineBotClient,
  messagingApi,
  webhook,
} from '@line/bot-sdk';
import { AllConfigType } from '@/config/config.type';
import { MessagesService } from '@/messages/messages.service';
import {
  MessagePlatform,
  MessageType,
  SenderType,
} from '@/messages/domain/message';
import { FileStorageService } from '@/files/file-storage.service';
import { FileType } from '@/files/domain/file';
import { getExtension, kindFromExtension } from '@/files/file-types';
import { prepareLineImage } from '@/files/line-image';
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
    private readonly fileStorage: FileStorageService,
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

  /**
   * Send text and/or a file (fileId from POST /api/v1/files/upload).
   * - Images go as LINE image messages (converted to JPEG if needed, with a
   *   small preview since LINE caps previews at 1 MB).
   * - LINE bots cannot send documents, and video/audio need a preview image /
   *   duration we don't have, so other files go as a text message with a
   *   download link.
   */
  async pushMessage(payload: PushMessageDto) {
    if (!payload.message && !payload.fileId) {
      throw new UnprocessableEntityException('message or fileId is required');
    }

    const file = payload.fileId
      ? await this.fileStorage.findById(payload.fileId)
      : null;
    if (payload.fileId && !file) {
      throw new NotFoundException(`File ${payload.fileId} not found`);
    }
    const kind = file ? kindFromExtension(getExtension(file.path)) : null;
    const fileName = payload.fileName?.trim() || null;

    const messages: messagingApi.Message[] = [];
    if (payload.message) {
      messages.push({ type: 'text', text: payload.message });
    }
    if (file && kind === 'image') {
      messages.push(await this.buildImageMessage(file));
    } else if (file) {
      const url = await this.fileStorage.getPublicUrl(file);
      messages.push({
        type: 'text',
        text: `📎 ${fileName ?? 'File'}\n${url}`,
      });
    }

    await this.client
      .pushMessage({ to: payload.customerId, messages })
      .catch((error: unknown) => {
        // Pass LINE's reason to the client instead of a bare 500.
        const reason = this.lineErrorReason(error);
        this.logger.warn(`LINE push failed: ${reason}`);
        throw new BadGatewayException(`LINE rejected the message: ${reason}`);
      });

    const base = {
      conversationId: payload.conversationId,
      messagePlatform: MessagePlatform.LINE,
      adminId: payload.adminId,
      senderType: SenderType.ADMIN,
      timestamp: new Date(),
    };
    if (payload.message) {
      await this.messagesService.create({ ...base, content: payload.message });
    }
    if (file && kind) {
      await this.messagesService.create({
        ...base,
        // Original file name for every kind, so logs can show it.
        content: fileName ?? '',
        messageType: kind as MessageType,
        fileId: file.id,
      });
    }
  }

  /** Image message with a LINE-compatible original and a < 1 MB preview. */
  private async buildImageMessage(
    file: FileType,
  ): Promise<messagingApi.ImageMessage> {
    let original: FileType = file;
    let preview: FileType = file;
    try {
      const prepared = await prepareLineImage(
        await this.fileStorage.read(file),
        getExtension(file.path),
      );
      if (prepared.original) {
        original = await this.fileStorage.store({
          buffer: prepared.original,
          contentType: 'image/jpeg',
        });
      }
      preview = await this.fileStorage.store({
        buffer: prepared.preview,
        contentType: 'image/jpeg',
      });
    } catch (error) {
      throw new UnprocessableEntityException(
        `Could not prepare the image for LINE: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return {
      type: 'image',
      originalContentUrl: await this.fileStorage.getPublicUrl(original),
      previewImageUrl: await this.fileStorage.getPublicUrl(preview),
    };
  }

  private lineErrorReason(error: unknown): string {
    if (error instanceof HTTPFetchError) {
      try {
        const body = JSON.parse(error.body) as {
          message?: string;
          details?: { message?: string; property?: string }[];
        };
        const detail = body.details?.[0];
        return [
          body.message,
          detail && `${detail.property ?? ''} ${detail.message ?? ''}`.trim(),
        ]
          .filter(Boolean)
          .join(' – ');
      } catch {
        return `${error.status} ${error.body}`;
      }
    }
    return error instanceof Error ? error.message : String(error);
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

    if (event.type === 'message') {
      const incoming = await this.toIncomingMessage(event.message);
      if (!incoming) return;
      await this.messagesService.create({
        ...incoming,
        conversationId: conversation.id,
        adminId: null,
        messagePlatform: MessagePlatform.LINE,
        senderType: SenderType.USER,
        timestamp: new Date(event.timestamp),
      });
    }
  }

  /** Map a LINE message to what we store; null = type we don't keep. */
  private async toIncomingMessage(message: webhook.MessageContent): Promise<{
    content: string;
    messageType: MessageType;
    fileId?: string | null;
  } | null> {
    switch (message.type) {
      case 'text':
        return { content: message.text, messageType: MessageType.TEXT };
      case 'sticker':
        return {
          content: `https://stickershop.line-scdn.net/stickershop/v1/sticker/${message.stickerId}/android/sticker.png`,
          messageType: MessageType.STICKER,
        };
      case 'image':
      case 'video':
      case 'audio':
      case 'file': {
        const fileName = message.type === 'file' ? message.fileName : null;
        const file = await this.downloadContent(
          message.id,
          message.type === 'file' ? undefined : message.contentProvider,
          message.type === 'video' || message.type === 'audio',
          fileName,
        );
        return {
          content: fileName ?? '',
          messageType: message.type as MessageType,
          // If the download failed the message is still saved, without file.
          fileId: file?.id ?? null,
        };
      }
      default:
        return null;
    }
  }

  private async downloadContent(
    messageId: string,
    contentProvider: webhook.ContentProvider | undefined,
    needsTranscoding: boolean,
    fileName: string | null,
  ): Promise<FileType | null> {
    try {
      if (
        contentProvider?.type === 'external' &&
        contentProvider.originalContentUrl
      ) {
        return await this.fileStorage.storeFromUrl(
          contentProvider.originalContentUrl,
        );
      }
      if (needsTranscoding) {
        await this.waitForTranscoding(messageId);
      }
      const res = await this.client.getMessageContentWithHttpInfo(messageId);
      const buffer = await this.fileStorage.readLimited(res.body);
      return await this.fileStorage.store({
        buffer,
        fileName,
        contentType: res.httpResponse.headers.get('content-type'),
      });
    } catch (error) {
      this.logger.warn(
        `Could not store LINE content ${messageId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  /** Video/audio may still be processing on LINE's side; wait up to ~10s. */
  private async waitForTranscoding(messageId: string): Promise<void> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const { status } =
        await this.client.getMessageContentTranscodingByMessageId(messageId);
      if (status === 'succeeded') return;
      if (status === 'failed') throw new Error('LINE transcoding failed');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('LINE transcoding timed out');
  }

  private buildWelcomeMessage(displayName: string): string {
    return `สวัสดีค่ะคุณ ${displayName} ยินดีต้อนรับสู่ ${this.channelName} ค่ะ 😊`;
  }
}
