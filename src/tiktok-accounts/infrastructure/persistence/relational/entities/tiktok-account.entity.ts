import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  Index,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'tiktok_account',
})
export class TiktokAccountEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Date,
  })
  refreshTokenExpiresAt: Date;

  @Column({
    nullable: false,
    type: 'text',
  })
  refreshToken: string;

  @Column({
    nullable: false,
    type: Date,
  })
  accessTokenExpiresAt: Date;

  @Column({
    nullable: false,
    type: 'text',
  })
  accessToken: string;

  @Column({
    nullable: false,
    type: String,
  })
  scope: string;

  @Column({
    nullable: true,
    type: String,
  })
  avatarUrl?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  displayName?: string | null;

  @Index({ unique: true })
  @Column({
    nullable: false,
    type: String,
  })
  openId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
