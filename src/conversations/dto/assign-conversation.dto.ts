import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class AssignConversationDto {
  @ApiProperty({ type: Number, nullable: true })
  @IsOptional()
  @IsInt()
  assigneeId: number | null;
}
