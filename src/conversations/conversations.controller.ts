import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationsDto } from './dto/create-conversations.dto';
import { UpdateConversationsDto } from './dto/update-conversations.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Conversations } from './domain/conversations';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '@/utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '@/utils/infinity-pagination';
import { FindAllConversationsDto } from './dto/find-all-conversations.dto';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';

@ApiTags('Conversations')
// @ApiBearerAuth()
// @UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'conversations',
  version: '1',
})
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiCreatedResponse({
    type: Conversations,
  })
  create(@Body() createConversationsDto: CreateConversationsDto) {
    return this.conversationsService.create(createConversationsDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Conversations),
  })
  async findAll(
    @Query() query: FindAllConversationsDto,
  ): Promise<InfinityPaginationResponseDto<Conversations>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.conversationsService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get('assignees')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  findAssignees(@Request() req: { user: JwtPayloadType }) {
    return this.conversationsService.findAssignees(Number(req.user.id));
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Conversations,
  })
  findById(@Param('id') id: string) {
    return this.conversationsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Conversations,
  })
  update(
    @Param('id') id: string,
    @Body() updateConversationsDto: UpdateConversationsDto,
  ) {
    return this.conversationsService.update(id, updateConversationsDto);
  }

  @Patch(':id/assign')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Conversations,
  })
  assign(
    @Request() req: { user: JwtPayloadType },
    @Param('id') id: string,
    @Body() body: AssignConversationDto,
  ) {
    return this.conversationsService.assign(
      id,
      body.assigneeId ?? null,
      Number(req.user.id),
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.conversationsService.remove(id);
  }
}
