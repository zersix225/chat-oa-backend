import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateConversationsDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  contactId: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  lastMessageId?: string | null;
}
