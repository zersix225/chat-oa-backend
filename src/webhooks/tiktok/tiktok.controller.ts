import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Request } from 'express';
import { TiktokService } from '@/webhooks/tiktok/tiktok.service';
import { TiktokWebhookDto } from '@/webhooks/tiktok/dto/webhook.dto';
import { TiktokPushMessageDto } from '@/webhooks/tiktok/dto/push-message.dto';

@ApiTags('Webhooks')
@Controller({
  path: 'webhooks',
  version: VERSION_NEUTRAL,
})
export class TiktokController {
  constructor(private readonly tiktokService: TiktokService) {}

  @Post('tiktok/push')
  @ApiSecurity('bearer')
  @HttpCode(HttpStatus.OK)
  pushMessage(@Body() body: TiktokPushMessageDto) {
    return this.tiktokService.pushMessage(body);
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
