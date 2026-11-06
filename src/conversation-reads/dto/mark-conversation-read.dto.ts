import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class MarkConversationReadDto {
  @ApiPropertyOptional({
    type: String,
    description:
      'Read up to this message. Omit to mark everything in the conversation as read.',
  })
  @IsOptional()
  @IsUUID()
  messageId?: string;
}
