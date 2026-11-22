import { ApiExcludeEndpoint, ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AllConfigType } from '@/config/config.type';
import { TiktokService } from '@/webhooks/tiktok/tiktok.service';
import { TiktokOauthService } from '@/webhooks/tiktok/tiktok-oauth.service';
import { TiktokWebhookDto } from '@/webhooks/tiktok/dto/webhook.dto';
import { TiktokPushMessageDto } from '@/webhooks/tiktok/dto/push-message.dto';
import { TiktokOauthCallbackDto } from '@/webhooks/tiktok/dto/oauth-callback.dto';

@ApiTags('Webhooks')
@Controller({
  path: 'webhooks',
  version: VERSION_NEUTRAL,
})
export class TiktokController {
  private readonly logger = new Logger(TiktokController.name);

  constructor(
    private readonly tiktokService: TiktokService,
    private readonly tiktokOauthService: TiktokOauthService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  @Post('tiktok/push')
  @ApiSecurity('bearer')
  @HttpCode(HttpStatus.OK)
  pushMessage(@Body() body: TiktokPushMessageDto) {
    return this.tiktokService.pushMessage(body);
  }

  /**
   * TikTok Login Kit redirect URI. Exchanges the code for tokens, stores the
   * account, then sends the browser back to the frontend with the outcome.
   */
  @Get('tiktok/oauth/callback')
  @ApiExcludeEndpoint()
  async oauthCallback(
    @Query() query: TiktokOauthCallbackDto,
    @Res() res: Response,
  ) {
    const frontend = new URL(
      '/tiktok-accounts',
      this.configService.getOrThrow('app.frontendDomain', { infer: true }),
    );

    if (query.error || !query.code || !query.state) {
      frontend.searchParams.set('tiktok', 'error');
      frontend.searchParams.set('reason', query.error ?? 'missing_code');
      return res.redirect(frontend.toString());
    }

    try {
      const account = await this.tiktokOauthService.handleCallback(
        query.code,
        query.state,
      );
      frontend.searchParams.set('tiktok', 'connected');
      frontend.searchParams.set('account', account.id);
    } catch (error) {
      this.logger.error(
        `TikTok OAuth callback failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      frontend.searchParams.set('tiktok', 'error');
      frontend.searchParams.set('reason', 'token_exchange_failed');
    }
    return res.redirect(frontend.toString());
  }

  @Post('tiktok')
  @HttpCode(HttpStatus.OK)
  receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('tiktok-signature') signature: string | undefined,
    @Body() body: TiktokWebhookDto,
  ) {
    this.tiktokService.verifySignature(signature, req.rawBody);
    return this.tiktokService.handleWebhook(body);
  }
}
