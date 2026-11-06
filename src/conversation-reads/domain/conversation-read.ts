import { User } from '../../users/domain/user';
import { ApiProperty } from '@nestjs/swagger';

export class ConversationRead {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({ type: String })
  conversationId: string;

  @ApiProperty({ type: Number })
  userId: number;

  @ApiProperty({ type: () => User, required: false })
  user?: User;

  @ApiProperty({ type: String, nullable: true })
  lastReadMessageId?: string | null;

  @ApiProperty({ type: Date })
  lastReadAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ConversationUnreadCount {
  @ApiProperty({ type: String })
  conversationId: string;

  @ApiProperty({ type: Number })
  unreadCount: number;
}
