import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { webhook } from '@line/bot-sdk';
import { LineService } from './line.service';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { PushMessageDto } from './dto/push-message.dto';

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

  @Post('line/push')
  // @UseGuards(AuthGuard('jwt'))
  @ApiSecurity('bearer')
  @HttpCode(HttpStatus.OK)
  pushMessage(@Body() body: PushMessageDto) {
    return this.lineService.pushMessage(body.message, body.lineUserId);
  }
}
