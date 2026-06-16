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

@Entity({
  name: 'line_contact',
})
@Unique(['lineUserId'])
export class LineContactEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    nullable: false,
    type: String,
  })
  lineUserId: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date | null;
}
