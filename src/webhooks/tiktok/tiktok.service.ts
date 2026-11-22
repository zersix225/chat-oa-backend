import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { AllConfigType } from '@/config/config.type';
import { TiktokWebhookDto } from '@/webhooks/tiktok/dto/webhook.dto';
import { TiktokPushMessageDto } from '@/webhooks/tiktok/dto/push-message.dto';
import { MessagesService } from '@/messages/messages.service';
import {
  MessagePlatform,
  MessageType,
  SenderType,
} from '@/messages/domain/message';
import { ContactsService } from '@/contacts/contacts.service';
import { ContactPlatform } from '@/contacts/domain/contact';
import { ConversationsService } from '@/conversations/conversations.service';
import { FileStorageService } from '@/files/file-storage.service';
import { getExtension, kindFromExtension } from '@/files/file-types';
import { TiktokAccountsService } from '@/tiktok-accounts/tiktok-accounts.service';
import { TiktokOauthService } from '@/webhooks/tiktok/tiktok-oauth.service';
import { TiktokApiClient } from '@/webhooks/tiktok/tiktok-api.client';
import { i18nError } from '@/utils/i18n-error';

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const SEEN_MESSAGE_LIMIT = 1000;

type TiktokMessageContent = {
  conversation_id?: string;
  message_id?: string;
  type?: string;
  timestamp?: number;
  from?: string;
  text?: { body?: string };
  sticker?: { url?: string };
  emoji?: { url?: string };
  share_post?: { embed_url?: string };
  template?: { title?: string };
};

@Injectable()
export class TiktokService {
  private readonly logger = new Logger(TiktokService.name);

  private readonly seenMessageIds = new Set<string>();

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly messagesService: MessagesService,
    private readonly contactsService: ContactsService,
    private readonly conversationsService: ConversationsService,
    private readonly fileStorage: FileStorageService,
    private readonly tiktokAccountsService: TiktokAccountsService,
    private readonly tiktokOauthService: TiktokOauthService,
    private readonly tiktokApi: TiktokApiClient,
  ) {}

  verifySignature(header: string | undefined, rawBody: Buffer | undefined) {
    const secret = this.configService.get('tiktok.clientSecret', {
      infer: true,
    });
    if (!secret) {
      this.logger.warn(
        'TIKTOK_CLIENT_SECRET not set, skipping signature check',
      );
      return;
    }
    if (!header || !rawBody) {
      throw new UnauthorizedException('Missing TikTok signature');
    }

    const parts = Object.fromEntries(
      header.split(',').map((kv) => kv.trim().split('=', 2)),
    ) as Record<string, string | undefined>;
    const timestamp = Number(parts.t);
    const signature = parts.s;
    if (!timestamp || !signature) {
      throw new UnauthorizedException('Malformed TikTok signature');
    }
    if (Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
      throw new UnauthorizedException('Stale TikTok signature');
    }

    const expected = Buffer.from(
      createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody.toString('utf8')}`)
        .digest('hex'),
      'hex',
    );
    const received = Buffer.from(signature, 'hex');
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('Invalid TikTok signature');
    }
  }

  async handleWebhook(body: TiktokWebhookDto) {
    const content = this.parseContent(body.content);
    this.logger.log(
      `TikTok event ${body.event} for ${body.user_openid ?? 'unknown user'}: ${JSON.stringify(content)}`,
    );

    if (body.event === 'im_receive_msg' && this.isObject(content)) {
      await this.handleIncomingMessage(
        content as TiktokMessageContent,
        body.create_time,
      );
    }

    return { received: true };
  }

  private async handleIncomingMessage(
    content: TiktokMessageContent,
    createTime: number,
  ) {
    const conversationId = content.conversation_id;
    if (!conversationId) return;

    const messageId = content.message_id;
    if (messageId && this.seenMessageIds.has(messageId)) return;

    const incoming = this.toIncomingMessage(content);
    if (!incoming) return;

    let contact = await this.contactsService.findLineUserId(conversationId);
    if (!contact) {
      contact = await this.contactsService.create({
        customerId: conversationId,
        displayName: content.from || 'TikTok user',
        pictureUrl: null,
        contactPlatform: ContactPlatform.TIKTOK,
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
      ...incoming,
      conversationId: conversation.id,
      adminId: null,
      messagePlatform: MessagePlatform.TIKTOK,
      senderType: SenderType.USER,
      timestamp: this.toDate(content.timestamp ?? createTime),
    });

    if (messageId) this.rememberMessageId(messageId);
  }

  private toIncomingMessage(
    content: TiktokMessageContent,
  ): { content: string; messageType: MessageType } | null {
    switch (content.type?.toLowerCase()) {
      case 'text':
        return content.text?.body
          ? { content: content.text.body, messageType: MessageType.TEXT }
          : null;
      case 'sticker':
      case 'emoji': {
        const url = content.sticker?.url ?? content.emoji?.url;
        return url ? { content: url, messageType: MessageType.STICKER } : null;
      }
      case 'share_post':
        return content.share_post?.embed_url
          ? {
              content: content.share_post.embed_url,
              messageType: MessageType.TEXT,
            }
          : null;
      case 'template':
        return content.template?.title
          ? { content: content.template.title, messageType: MessageType.TEXT }
          : null;
      case 'image':
        return { content: '[image]', messageType: MessageType.TEXT };
      case 'video':
        return { content: '[video]', messageType: MessageType.TEXT };
      default:
        return null;
    }
  }

  private rememberMessageId(messageId: string) {
    this.seenMessageIds.add(messageId);
    if (this.seenMessageIds.size > SEEN_MESSAGE_LIMIT) {
      const oldest = this.seenMessageIds.values().next().value;
      if (oldest) this.seenMessageIds.delete(oldest);
    }
  }

  private toDate(time: number): Date {
    return new Date(time < 1e12 ? time * 1000 : time);
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  async pushMessage(payload: TiktokPushMessageDto) {
    if (!payload.text && !payload.fileId) {
      throw new UnprocessableEntityException(
        i18nError('messageOrFileRequired'),
      );
    }

    const file = payload.fileId
      ? await this.fileStorage.findById(payload.fileId)
      : null;
    if (payload.fileId && !file) {
      throw new NotFoundException(
        i18nError('fileNotFound', { id: payload.fileId! }),
      );
    }
    const kind = file ? kindFromExtension(getExtension(file.path)) : null;
    const fileName = payload.fileName?.trim() || null;

    const sender = await this.getSendingAccount();
    const target = {
      accessToken: await this.tiktokOauthService.getValidAccessToken(
        sender.openId,
      ),
      businessId: sender.openId,
      conversationId: payload.recipientId,
    };

    if (payload.text) {
      await this.tiktokApi.sendText(target, payload.text);
    }
    if (file) {
      // Sent as a link until TikTok's image upload flow is verified.
      const url = await this.fileStorage.getPublicUrl(file);
      await this.tiktokApi.sendText(target, `${fileName ?? 'File'}\n${url}`);
    }

    const base = {
      conversationId: payload.conversationId,
      messagePlatform: MessagePlatform.TIKTOK,
      adminId: payload.adminId,
      senderType: SenderType.ADMIN,
      timestamp: new Date(),
    };
    if (payload.text) {
      await this.messagesService.create({ ...base, content: payload.text });
    }
    if (file && kind) {
      await this.messagesService.create({
        ...base,
        content: fileName ?? '',
        messageType: kind as MessageType,
        fileId: file.id,
      });
    }
  }

  /**
   * The business account replies are sent from. Only one connected account is
   * supported for now; conversations aren't yet linked to a specific account.
   */
  private async getSendingAccount() {
    const accounts = await this.tiktokAccountsService.findAllWithPagination({
      paginationOptions: { page: 1, limit: 2 },
    });
    if (accounts.length === 0) {
      throw new ConflictException(i18nError('tiktokNotConnected'));
    }
    if (accounts.length > 1) {
      this.logger.warn(
        `Multiple TikTok accounts connected; replying as ${accounts[0].displayName ?? accounts[0].openId}`,
      );
    }
    return accounts[0];
  }

  private parseContent(content: string | undefined): unknown {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }
}
