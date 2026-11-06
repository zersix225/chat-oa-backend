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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Contact } from './domain/contact';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '@/utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '@/utils/infinity-pagination';
import { FindAllContactsDto } from './dto/find-all-contacts.dto';

@ApiTags('Contacts')
@ApiBearerAuth()
// @UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'contacts',
  version: '1',
})
export class ContactsController {
  constructor(private readonly lineContactsService: ContactsService) {}

  @Post()
  @ApiCreatedResponse({
    type: Contact,
  })
  create(@Body() createLineContactDto: CreateContactDto) {
    return this.lineContactsService.create(createLineContactDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(Contact),
  })
  @UseGuards(AuthGuard('jwt'))
  async findAll(
    @Query() query: FindAllContactsDto,
  ): Promise<InfinityPaginationResponseDto<Contact>> {
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
    type: Contact,
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
    type: Contact,
  })
  update(
    @Param('id') id: string,
    @Body() updateLineContactDto: UpdateContactDto,
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
