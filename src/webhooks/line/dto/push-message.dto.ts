import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PushMessageDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  lineUserId: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  message: string;
}
