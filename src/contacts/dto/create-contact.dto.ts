import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactPlatform } from '@/contacts/domain/contact';

export class CreateContactDto {
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

  @ApiProperty({ enum: ContactPlatform })
  @IsEnum(ContactPlatform)
  contactPlatform: ContactPlatform;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  customerId: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
