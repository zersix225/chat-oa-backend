import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { TiktokAccountsService } from './tiktok-accounts.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { TiktokAccount } from './domain/tiktok-account';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllTiktokAccountsDto } from './dto/find-all-tiktok-accounts.dto';

@ApiTags('TikTok accounts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'tiktok-accounts',
  version: '1',
})
export class TiktokAccountsController {
  constructor(private readonly tiktokAccountsService: TiktokAccountsService) {}

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(TiktokAccount),
  })
  async findAll(
    @Query() query: FindAllTiktokAccountsDto,
  ): Promise<InfinityPaginationResponseDto<TiktokAccount>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.tiktokAccountsService.findAllWithPagination({
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
    type: TiktokAccount,
  })
  findById(@Param('id') id: string) {
    return this.tiktokAccountsService.findById(id);
  }

  // Disconnecting goes through DELETE /v1/tiktok/oauth/accounts/:id so the
  // token is revoked at TikTok before the row is removed.
}
