import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, BeforeInsert, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AdminUserEntity } from './AdminUser';

@Entity('password_reset_token')
export class PasswordResetTokenEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  /** sha256 of the emailed token */
  @Column({ type: 'text', unique: true, name: 'token_hash' })
  tokenHash: string;

  @ManyToOne(() => AdminUserEntity, (user) => user.passwordResetTokens, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  @Index('idx_password_reset_token_user')
  user: AdminUserEntity;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'used_at' })
  usedAt: Date | null;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
