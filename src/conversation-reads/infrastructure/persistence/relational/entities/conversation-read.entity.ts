import { MessageEntity } from '../../../../../messages/infrastructure/persistence/relational/entities/message.entity';

import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import { ConversationsEntity } from '../../../../../conversations/infrastructure/persistence/relational/entities/conversations.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

/**
 * One row per (conversation, admin user): how far that admin has read.
 */
@Entity({
  name: 'conversation_read',
})
@Unique(['conversationId', 'userId'])
export class ConversationReadEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: 'timestamp',
  })
  lastReadAt: Date;

  @Column({ type: 'uuid', nullable: true })
  lastReadMessageId?: string | null;

  @ManyToOne(() => MessageEntity, {
    eager: false,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'lastReadMessageId' })
  lastReadMessage?: MessageEntity | null;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => UserEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @Column({ type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => ConversationsEntity, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation?: ConversationsEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
