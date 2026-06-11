import { ApiProperty } from '@nestjs/swagger';

export enum MessagePlatform {
  LINE = 'line',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
}

export class Message {
  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  content: string;

  @ApiProperty({ type: String })
  senderId: string;

  @ApiProperty({ enum: MessagePlatform })
  messagePlatform: MessagePlatform;

  @ApiProperty({
    type: () => Date,
    nullable: false,
  })
  timestamp: Date;
}
