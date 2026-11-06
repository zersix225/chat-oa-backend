import { EntityRelationalHelper } from '@/utils/relational-entity-helper';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import {
  MessagePlatform,
  MessageType,
  SenderType,
} from '@/messages/domain/message';
import { ConversationsEntity } from '@/conversations/infrastructure/persistence/relational/entities/conversations.entity';
import { UserEntity } from '@/users/infrastructure/persistence/relational/entities/user.entity';
import { FileEntity } from '@/files/infrastructure/persistence/relational/entities/file.entity';

@Entity({
  name: 'message',
})
export class MessageEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => ConversationsEntity)
  @JoinColumn({ name: 'conversationId' })
  conversation: ConversationsEntity;

  @Column({ nullable: true })
  adminId?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'adminId' })
  admin?: UserEntity | null;

  @Column()
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @Column({ type: 'uuid', nullable: true })
  fileId?: string | null;

  // ManyToOne (not OneToOne) so an admin can send the same uploaded file
  // more than once.
  @ManyToOne(() => FileEntity, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'fileId' })
  file?: FileEntity | null;

  @Column({
    type: 'enum',
    enum: MessagePlatform,
  })
  messagePlatform: MessagePlatform;

  @Column({
    type: 'enum',
    enum: SenderType,
    default: SenderType.USER,
  })
  senderType: SenderType;

  @Column()
  timestamp: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
