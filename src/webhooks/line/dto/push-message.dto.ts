import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class PushMessageDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Text to send. Required unless fileId is given.',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  message?: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      'File to send: the file id returned by POST /api/v1/files/upload. Images are sent as images; other files as a download link.',
  })
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Original file name, shown to the customer and in the chat',
  })
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
