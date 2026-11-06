import { ApiProperty } from '@nestjs/swagger';
import { RecipientDto } from '@/webhooks/facebook/dto/webhook.dto';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  text?: string;
}

export class FacebookPushMessageDto {
  @ApiProperty({ type: RecipientDto })
  @ValidateNested()
  @Type(() => RecipientDto)
  recipient: RecipientDto;

  @ApiProperty({ type: String })
  @IsString()
  messaging_type: string;

  @ApiProperty({ type: MessageDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => MessageDto)
  message?: MessageDto;

  @ApiProperty({
    type: String,
    required: false,
    description:
      'File to send (image, video, audio or document): the file id returned by POST /api/v1/files/upload',
  })
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Original file name, shown in the chat',
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
