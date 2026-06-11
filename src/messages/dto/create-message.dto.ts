import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { MessagePlatform } from '../domain/message';

export class CreateMessageDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  senderId: string;

  @ApiProperty({ enum: MessagePlatform })
  @IsNotEmpty()
  @IsEnum(MessagePlatform)
  messagePlatform: MessagePlatform;

  @ApiProperty({ type: Date })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  timestamp: Date;
}
