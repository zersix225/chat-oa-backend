import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConversationReadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
