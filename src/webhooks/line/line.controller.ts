import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { webhook } from '@line/bot-sdk';
import { LineService } from './line.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller({
  path: 'webhooks',
  version: VERSION_NEUTRAL,
})
export class LineController {
  constructor(private readonly lineService: LineService) {}

  @Post('line')
  @HttpCode(HttpStatus.OK)
  receiveWebhook(@Body() body: webhook.CallbackRequest) {
    return this.lineService.handleWebhook(body.events);
  }
}
