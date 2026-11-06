import { ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';

import { TiktokService } from './tiktok.service';

@ApiTags('Webhooks')
@Controller({
  path: 'webhooks',
  version: VERSION_NEUTRAL,
})
export class TiktokController {
  constructor(private readonly tiktokService: TiktokService) {}

  @Post('tiktok')
  @HttpCode(HttpStatus.OK)
  receiveWebhook(@Body() body: unknown) {
    return this.tiktokService.handleWebhook(body);
  }
}
