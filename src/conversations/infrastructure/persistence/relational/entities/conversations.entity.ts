import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '@/utils/relational-entity-helper';
import { ContactEntity } from '@/contacts/infrastructure/persistence/relational/entities/contact.entity';
import { MessageEntity } from '@/messages/infrastructure/persistence/relational/entities/message.entity';
import { UserEntity } from '@/users/infrastructure/persistence/relational/entities/user.entity';

@Entity({
  name: 'conversations',
})
export class ConversationsEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  contactId: string;

  @OneToOne(() => ContactEntity, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contactId' })
  contact: ContactEntity;

  @Column({
    nullable: true,
  })
  lastMessageId?: string | null;

  @OneToOne(() => MessageEntity, { nullable: true })
  @JoinColumn({ name: 'lastMessageId' })
  lastMessage?: MessageEntity | null;

  @Column({ type: 'int', nullable: true })
  assigneeId?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: UserEntity | null;

  @OneToMany(() => MessageEntity, (message) => message.conversation, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  messages: MessageEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deleteAt: Date;
}
