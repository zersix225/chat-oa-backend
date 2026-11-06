import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConversationReadsService } from './conversation-reads.service';
import { ConversationRead } from './domain/conversation-read';
import { MarkConversationReadDto } from './dto/mark-conversation-read.dto';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';

type AuthRequest = { user: JwtPayloadType };

// JWT is required here: read state is per admin, so we need to know who "me" is.
@ApiTags('Conversation reads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'conversation-reads',
  version: '1',
})
export class ConversationReadsController {
  constructor(
    private readonly conversationReadsService: ConversationReadsService,
  ) {}

  /** Unread customer-message counts for the current admin, per conversation. */
  @Get('unread')
  @HttpCode(HttpStatus.OK)
  getMyUnreadCounts(@Request() req: AuthRequest) {
    return this.conversationReadsService.getUnreadCounts(Number(req.user.id));
  }

  /** Mark a conversation as read by the current admin. */
  @Post(':conversationId')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'conversationId', type: String })
  @ApiOkResponse({ type: ConversationRead })
  markAsRead(
    @Request() req: AuthRequest,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() body: MarkConversationReadDto,
  ) {
    return this.conversationReadsService.markAsRead(
      conversationId,
      Number(req.user.id),
      body.messageId,
    );
  }

  /** The current admin's read pointer in this conversation. */
  @Get(':conversationId/me')
  @ApiParam({ name: 'conversationId', type: String })
  @ApiOkResponse({ type: ConversationRead })
  findMine(
    @Request() req: AuthRequest,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationReadsService.findMyRead(
      conversationId,
      Number(req.user.id),
    );
  }

  /** Which admins have read this conversation, and how far. */
  @Get(':conversationId/readers')
  @ApiParam({ name: 'conversationId', type: String })
  @ApiOkResponse({ type: ConversationRead, isArray: true })
  findReaders(@Param('conversationId', ParseUUIDPipe) conversationId: string) {
    return this.conversationReadsService.findReaders(conversationId);
  }
}
