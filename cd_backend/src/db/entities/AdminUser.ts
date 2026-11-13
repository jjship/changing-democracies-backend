import { Entity, PrimaryColumn, Column, OneToMany, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AuthSessionEntity } from './AuthSession';
import { PasswordResetTokenEntity } from './PasswordResetToken';

@Entity('admin_user')
export class AdminUserEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  /** lowercase */
  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'text' })
  name: string;

  /** null until set via an invite or reset link */
  @Column({ type: 'text', nullable: true, name: 'password_hash' })
  passwordHash: string | null;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => AuthSessionEntity, (session) => session.user)
  sessions?: AuthSessionEntity[];

  @OneToMany(() => PasswordResetTokenEntity, (token) => token.user)
  passwordResetTokens?: PasswordResetTokenEntity[];
}
