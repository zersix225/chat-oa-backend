import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LineContactDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
