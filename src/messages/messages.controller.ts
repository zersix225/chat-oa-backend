import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import {
  ConversationItem,
  MessageThreadItem,
} from './infrastructure/persistence/message.repository';

// @UseGuards(AuthGuard('jwt'))
@ApiSecurity('bearer')
@ApiTags('Messages')
@Controller({ path: 'messages', version: '1' })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  findConversations(): Promise<ConversationItem[]> {
    return this.messagesService.findConversations();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  @ApiQuery({ name: 'senderId', required: true, type: String })
  findBySenderId(
    @Query('senderId') senderId: string,
  ): Promise<MessageThreadItem[]> {
    return this.messagesService.findBySenderId(senderId);
  }
}
