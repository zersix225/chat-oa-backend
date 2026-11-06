import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { MessagePlatform, MessageType, SenderType } from '../domain/message';

export class CreateMessageDto {
  @ApiProperty({ type: String })
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageType, required: false })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ApiProperty({ type: String, required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  fileId?: string | null;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  @ApiProperty({ type: Number, nullable: true })
  @IsNotEmpty()
  adminId: number | null;

  @ApiProperty({ enum: MessagePlatform })
  @IsNotEmpty()
  @IsEnum(MessagePlatform)
  messagePlatform: MessagePlatform;

  @ApiProperty({ enum: SenderType })
  @IsNotEmpty()
  @IsEnum(SenderType)
  senderType: SenderType;

  @ApiProperty({ type: Date })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  timestamp: Date;
}
