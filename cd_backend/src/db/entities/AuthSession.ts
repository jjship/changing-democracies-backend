import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, BeforeInsert, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AdminUserEntity } from './AdminUser';

@Entity('auth_session')
export class AuthSessionEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  /** sha256 of the client token */
  @Column({ type: 'text', unique: true, name: 'token_hash' })
  tokenHash: string;

  @ManyToOne(() => AdminUserEntity, (user) => user.sessions, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  @Index('idx_auth_session_user')
  user: AdminUserEntity;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamp', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'text', nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string | null;
}
