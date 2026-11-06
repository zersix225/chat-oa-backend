import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { EntityRelationalHelper } from '@/utils/relational-entity-helper';
import { ContactPlatform } from '@/contacts/domain/contact';

@Entity({
  name: 'contact',
})
@Unique(['customerId'])
export class ContactEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    nullable: false,
    type: String,
  })
  customerId: string;

  @Column({
    nullable: false,
    type: String,
  })
  displayName: string;

  @Column({
    nullable: true,
    type: String,
  })
  pictureUrl?: string | null;

  @Column({
    type: 'enum',
    enum: ContactPlatform,
  })
  contactPlatform: ContactPlatform;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date | null;
}
