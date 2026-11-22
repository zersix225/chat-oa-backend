import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TiktokAccount {
  @Exclude({ toPlainOnly: true })
  refreshTokenExpiresAt: Date;

  @Exclude({ toPlainOnly: true })
  refreshToken: string;

  @Exclude({ toPlainOnly: true })
  accessTokenExpiresAt: Date;

  @Exclude({ toPlainOnly: true })
  accessToken: string;

  @ApiProperty({ type: String })
  scope: string;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl?: string | null;

  @ApiProperty({ type: String, nullable: true })
  displayName?: string | null;

  @ApiProperty({ type: String })
  openId: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
