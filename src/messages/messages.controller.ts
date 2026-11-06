import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { InfinityPaginationResponse } from '@/utils/dto/infinity-pagination-response.dto';
import { FindAllConversationsDto } from '@/conversations/dto/find-all-conversations.dto';
import { Message } from '@/messages/domain/message';

// @UseGuards(AuthGuard('jwt'))
@ApiSecurity('bearer')
@ApiTags('Messages')
@Controller({ path: 'messages', version: '1' })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // @Get('conversations')
  // @HttpCode(HttpStatus.OK)
  // @ApiOkResponse()
  // findConversations(): Promise<ConversationItem[]> {
  //   return this.messagesService.findConversations();
  // }

  // @Get(':id')
  // @ApiParam({
  //   name: 'id',
  //   type: String,
  //   required: true,
  // })
  // @ApiOkResponse({
  //   type: Conversations,
  // })
  // findById(@Param('id') id: string) {
  //   return this.messagesService.findById(id);
  // }

  @Get(':conversationId')
  @ApiParam({
    name: 'conversationId',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: InfinityPaginationResponse(Message),
  })
  async findAllByAdmin(
    @Query() query: FindAllConversationsDto,
    @Param('conversationId') conversationId: string,
  ) {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return await this.messagesService.findAllWithPaginationByAdmin({
      paginationOptions: { page, limit },
      conversationId,
    });
  }
}
