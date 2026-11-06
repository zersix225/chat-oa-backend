import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PushMessageDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ type: Number, nullable: true })
  @IsNotEmpty()
  adminId: number | null;

  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  conversationId: string;
}
