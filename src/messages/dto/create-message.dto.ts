import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { MessagePlatform, SenderType } from '../domain/message';

export class CreateMessageDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  content: string;

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
