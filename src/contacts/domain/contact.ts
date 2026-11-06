import { ApiProperty } from '@nestjs/swagger';

export enum ContactPlatform {
  LINE = 'line',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
}

export class Contact {
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  pictureUrl?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  displayName: string;

  @ApiProperty({ enum: ContactPlatform })
  contactPlatform: ContactPlatform;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  customerId: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
