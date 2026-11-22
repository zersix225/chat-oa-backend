import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class TiktokPushMessageDto {
  @ApiProperty({ type: String, description: 'TikTok user open_id' })
  @IsNotEmpty()
  @IsString()
  recipientId: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  text?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'File id returned by POST /api/v1/files/upload',
  })
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiProperty({ type: Number, nullable: true })
  @IsNotEmpty()
  adminId: number | null;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  conversationId: string;
}
