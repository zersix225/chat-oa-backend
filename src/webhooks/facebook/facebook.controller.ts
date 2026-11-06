import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Response } from 'express';
import { FacebookService } from '@/webhooks/facebook/facebook.servive';
import { FacebookWebhookDto } from '@/webhooks/facebook/dto/webhook.dto';
import { FacebookPushMessageDto } from '@/webhooks/facebook/dto/push-message.dto';

@ApiTags('Webhooks')
@Controller({
  path: 'webhooks',
  version: VERSION_NEUTRAL,
})
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  @Post('facebook/push')
  // @UseGuards(AuthGuard('jwt'))
  @ApiSecurity('bearer')
  @HttpCode(HttpStatus.OK)
  pushMessage(@Body() body: FacebookPushMessageDto) {
    return this.facebookService.pushMessage(body);
  }

  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  receiveWebhook(@Body() body: FacebookWebhookDto) {
    return this.facebookService.handleWebhook(body);
  }

  @Get('facebook')
  @HttpCode(HttpStatus.OK)
  verifyWebhook(
    @Query('hub.mode') hubMode: string,
    @Query('hub.verify_token') hubVerifyToken: string,
    @Query('hub.challenge') hubChallenge: string,
    @Res() res: Response,
  ) {
    const VERIFY_TOKEN = 'PCM_BOT';

    const mode = hubMode;
    const token = hubVerifyToken;
    const challenge = hubChallenge;

    if (!mode || !token) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send('Missing hub.mode or hub.verify_token');
    }

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(HttpStatus.OK).send(challenge);
    }

    return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
  }
}
