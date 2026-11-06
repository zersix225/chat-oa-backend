import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '@/users/infrastructure/persistence/relational/entities/user.entity';

export enum MessagePlatform {
  LINE = 'line',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
}

export enum SenderType {
  USER = 'user',
  ADMIN = 'admin',
}

export class Message {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String })
  content: string;

  @ApiProperty({ type: String })
  conversationId: string;

  @ApiProperty({ type: () => UserEntity })
  admin?: UserEntity | null;

  @ApiProperty({ type: Number, nullable: true })
  adminId?: number | null;

  @ApiProperty({ enum: MessagePlatform })
  messagePlatform: MessagePlatform;

  @ApiProperty({ enum: SenderType })
  senderType: SenderType;

  @ApiProperty({
    type: () => Date,
    nullable: false,
  })
  timestamp: Date;
}
