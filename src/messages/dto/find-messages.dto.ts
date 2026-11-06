import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { FindAllConversationsDto } from '@/conversations/dto/find-all-conversations.dto';
import { SenderType } from '@/messages/domain/message';

export class FindMessagesDto extends FindAllConversationsDto {
  @ApiPropertyOptional({ enum: SenderType })
  @IsOptional()
  @IsEnum(SenderType)
  senderType?: SenderType;
}
