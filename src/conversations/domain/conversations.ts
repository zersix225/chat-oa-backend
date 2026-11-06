import { ApiProperty } from '@nestjs/swagger';
import { Contact } from '@/contacts/domain/contact';
import { Message } from '@/messages/domain/message';
import { User } from '@/users/domain/user';

export class Conversations {
  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty({ type: () => Contact })
  contact?: Contact | undefined;

  @ApiProperty({
    type: String,
  })
  contactId: string;

  @ApiProperty({ type: () => Message })
  lastMessage?: Message | null;

  @ApiProperty({
    type: String,
    nullable: true,
  })
  lastMessageId?: string | null;

  @ApiProperty({ type: () => Message })
  messages?: Message[];

  @ApiProperty({ type: Number, nullable: true })
  assigneeId?: number | null;

  @ApiProperty({ type: () => User, nullable: true })
  assignee?: User | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
