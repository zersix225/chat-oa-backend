import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '@/users/infrastructure/persistence/relational/entities/user.entity';
import { FileType } from '@/files/domain/file';

export enum MessagePlatform {
  LINE = 'line',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
}

export enum SenderType {
  USER = 'user',
  ADMIN = 'admin',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  /** LINE sticker: `content` holds the sticker image URL, no stored file. */
  STICKER = 'sticker',
}

export class Message {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({
    type: String,
    description:
      'Text for text messages; original file name for media/files (empty if unknown, e.g. customer photos); sticker image URL for stickers',
  })
  content: string;

  @ApiProperty({ enum: MessageType, default: MessageType.TEXT })
  messageType: MessageType;

  @ApiProperty({ type: String, nullable: true })
  fileId?: string | null;

  @ApiProperty({ type: () => FileType, nullable: true })
  file?: FileType | null;

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
