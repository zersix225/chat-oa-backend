import { ApiProperty } from '@nestjs/swagger';
import { RecipientDto } from '@/webhooks/facebook/dto/webhook.dto';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @ApiProperty({ type: String })
  @IsString()
  text: string;
}

export class FacebookPushMessageDto {
  @ApiProperty({ type: RecipientDto })
  @ValidateNested()
  @Type(() => RecipientDto)
  recipient: RecipientDto;

  @ApiProperty({ type: String })
  @IsString()
  messaging_type: string;

  @ApiProperty({ type: MessageDto })
  @ValidateNested()
  @Type(() => MessageDto)
  message: MessageDto;

  @ApiProperty({ type: Number, nullable: true })
  @IsNotEmpty()
  adminId: number | null;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  conversationId: string;
}
