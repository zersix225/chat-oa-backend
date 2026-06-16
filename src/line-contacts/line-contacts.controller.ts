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
} from '@nestjs/common';
import { LineContactsService } from './line-contacts.service';
import { CreateLineContactDto } from './dto/create-line-contact.dto';
import { UpdateLineContactDto } from './dto/update-line-contact.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LineContact } from './domain/line-contact';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '@/utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '@/utils/infinity-pagination';
import { FindAllLineContactsDto } from './dto/find-all-line-contacts.dto';

@ApiTags('LineContacts')
@ApiBearerAuth()
// @UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'line-contacts',
  version: '1',
})
export class LineContactsController {
  constructor(private readonly lineContactsService: LineContactsService) {}

  @Post()
  @ApiCreatedResponse({
    type: LineContact,
  })
  create(@Body() createLineContactDto: CreateLineContactDto) {
    return this.lineContactsService.create(createLineContactDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(LineContact),
  })
  async findAll(
    @Query() query: FindAllLineContactsDto,
  ): Promise<InfinityPaginationResponseDto<LineContact>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.lineContactsService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: LineContact,
  })
  findById(@Param('id') id: string) {
    return this.lineContactsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: LineContact,
  })
  update(
    @Param('id') id: string,
    @Body() updateLineContactDto: UpdateLineContactDto,
  ) {
    return this.lineContactsService.update(id, updateLineContactDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.lineContactsService.remove(id);
  }
}
