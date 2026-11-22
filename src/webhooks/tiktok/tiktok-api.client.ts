import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AllConfigType } from '@/config/config.type';

const SEND_MESSAGE_PATH = '/business/message/send/';

type TiktokBusinessEnvelope<T = unknown> = {
  code: number;
  message?: string;
  request_id?: string;
  data?: T;
};

export type TiktokSendTarget = {
  accessToken: string;
  /** The connected business account (TikTok open_id) sending the message. */
  businessId: string;
  /** TikTok conversation id, stored as the contact's customerId. */
  conversationId: string;
};

@Injectable()
export class TiktokApiClient {
  private readonly logger = new Logger(TiktokApiClient.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly httpService: HttpService,
  ) {}

  async sendText(target: TiktokSendTarget, text: string): Promise<void> {
    await this.post(SEND_MESSAGE_PATH, target.accessToken, {
      business_id: target.businessId,
      recipient_type: 'CONVERSATION',
      recipient: target.conversationId,
      message_type: 'TEXT',
      text: { body: text },
    });
  }

  private async post<T>(
    path: string,
    accessToken: string,
    body: Record<string, unknown>,
  ): Promise<T | undefined> {
    const baseUrl = this.configService
      .getOrThrow('tiktok.businessApiBaseUrl', { infer: true })
      .replace(/\/$/, '');

    let envelope: TiktokBusinessEnvelope<T>;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<TiktokBusinessEnvelope<T>>(
          `${baseUrl}${path}`,
          body,
          {
            headers: {
              'Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      envelope = data;
    } catch (error) {
      const reason = this.describeError(error);
      this.logger.warn(`TikTok ${path} failed: ${reason}`);
      throw new BadGatewayException(`TikTok rejected the message: ${reason}`);
    }

    // TikTok API for Business returns HTTP 200 with a non-zero `code` on error.
    if (envelope?.code !== 0) {
      const reason =
        `${envelope?.code ?? 'unknown'} ${envelope?.message ?? ''}`.trim();
      this.logger.warn(
        `TikTok ${path} error: ${reason} (request_id=${envelope?.request_id ?? '-'})`,
      );
      throw new BadGatewayException(`TikTok rejected the message: ${reason}`);
    }
    return envelope.data;
  }

  private describeError(error: unknown): string {
    if (isAxiosError(error)) {
      const data = error.response?.data as
        | TiktokBusinessEnvelope
        | string
        | undefined;
      if (data && typeof data === 'object' && 'message' in data) {
        return `${error.response?.status ?? ''} ${data.message ?? ''}`.trim();
      }
      return `${error.response?.status ?? ''} ${error.message}`.trim();
    }
    return error instanceof Error ? error.message : String(error);
  }
}
