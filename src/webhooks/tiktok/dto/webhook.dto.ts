import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class TiktokWebhookDto {
  @ApiProperty({
    required: false,
    description: 'App client key the event belongs to',
  })
  @IsOptional()
  @IsString()
  client_key?: string;

  @ApiProperty({ description: 'Event name, e.g. authorization.removed' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Unix timestamp (milliseconds)' })
  @IsNumber()
  create_time: number;

  @ApiProperty({ required: false, description: 'TikTok user open_id' })
  @IsOptional()
  @IsString()
  user_openid?: string;

  @ApiProperty({ required: false, description: 'JSON-encoded event payload' })
  @IsOptional()
  @IsString()
  content?: string;
}
