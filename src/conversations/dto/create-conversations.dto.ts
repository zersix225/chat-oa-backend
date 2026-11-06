import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateConversationsDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  contactId: string;

  @ApiProperty({
    type: String,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  lastMessageId?: string | null;
}
