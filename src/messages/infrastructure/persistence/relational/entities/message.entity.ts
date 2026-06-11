import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { MessagePlatform } from '../../../../domain/message';

@Entity({
  name: 'message',
})
export class MessageEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @Column({
    type: 'enum',
    enum: MessagePlatform,
    name: 'message_platform',
  })
  messagePlatform: MessagePlatform;

  @Column()
  senderId: string;

  @Column()
  timestamp: Date;
}
