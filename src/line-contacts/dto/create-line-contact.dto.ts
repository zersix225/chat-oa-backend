import {
  // decorators here

  IsString,
  IsOptional,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateLineContactDto {
  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  pictureUrl?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  displayName: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  lineUserId: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
