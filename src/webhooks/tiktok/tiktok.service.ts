import {
  Injectable,
  Logger,
  NotImplementedException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { AllConfigType } from '@/config/config.type';
import { TiktokWebhookDto } from '@/webhooks/tiktok/dto/webhook.dto';
import { TiktokPushMessageDto } from '@/webhooks/tiktok/dto/push-message.dto';

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

@Injectable()
export class TiktokService {
  private readonly logger = new Logger(TiktokService.name);

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

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

  handleWebhook(body: TiktokWebhookDto) {
    const content = this.parseContent(body.content);
    this.logger.log(
      `TikTok event ${body.event} for ${body.user_openid ?? 'unknown user'}: ${JSON.stringify(content)}`,
    );
    return { received: true };
  }

  pushMessage(payload: TiktokPushMessageDto): never {
    if (!payload.text && !payload.fileId) {
      throw new UnprocessableEntityException('text or fileId is required');
    }
    throw new NotImplementedException('TikTok push is not implemented yet');
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
