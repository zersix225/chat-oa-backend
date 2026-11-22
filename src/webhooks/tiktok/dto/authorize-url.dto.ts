import { ApiProperty } from '@nestjs/swagger';

export class TiktokAuthorizeUrlDto {
  @ApiProperty({ example: 'https://www.tiktok.com/v2/auth/authorize/?...' })
  url: string;
}
