import { ApiProperty } from '@nestjs/swagger';

export class LineContact {
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

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  lineUserId: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
