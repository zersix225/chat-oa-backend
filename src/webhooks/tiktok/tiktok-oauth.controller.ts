import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';
import { TiktokOauthService } from '@/webhooks/tiktok/tiktok-oauth.service';
import { TiktokAuthorizeUrlDto } from '@/webhooks/tiktok/dto/authorize-url.dto';

@ApiTags('TikTok accounts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'tiktok/oauth',
  version: '1',
})
export class TiktokOauthController {
  constructor(private readonly tiktokOauthService: TiktokOauthService) {}

  @Get('authorize-url')
  @ApiOkResponse({ type: TiktokAuthorizeUrlDto })
  getAuthorizeUrl(
    @Request() req: { user: JwtPayloadType },
  ): TiktokAuthorizeUrlDto {
    return { url: this.tiktokOauthService.getAuthorizeUrl(req.user.id) };
  }

  @Delete('accounts/:id')
  @ApiParam({ name: 'id', type: String, required: true })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnect(@Param('id') id: string) {
    return this.tiktokOauthService.disconnect(id);
  }
}
