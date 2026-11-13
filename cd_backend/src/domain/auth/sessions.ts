import { DataSource } from 'typeorm';
import { AdminUserEntity } from '../../db/entities/AdminUser';
import { AuthSessionEntity } from '../../db/entities/AuthSession';
import { generateToken, hashToken } from '../../auth/tokens';

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// sliding expiry: renew after a day of use
const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;
const USER_AGENT_MAX_LENGTH = 512;

export async function createSession({
  dbConnection,
  user,
  ipAddress,
  userAgent,
}: {
  dbConnection: DataSource;
  user: AdminUserEntity;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();

  const session = new AuthSessionEntity();
  session.tokenHash = hashToken(token);
  session.user = user;
  session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  session.ipAddress = ipAddress ?? null;
  session.userAgent = userAgent ? userAgent.slice(0, USER_AGENT_MAX_LENGTH) : null;

  await dbConnection.getRepository(AuthSessionEntity).save(session);

  return { token, expiresAt: session.expiresAt };
}

export async function findSessionUser({
  dbConnection,
  token,
}: {
  dbConnection: DataSource;
  token: string;
}): Promise<AdminUserEntity | null> {
  const repository = dbConnection.getRepository(AuthSessionEntity);
  const session = await repository.findOne({ where: { tokenHash: hashToken(token) }, relations: { user: true } });

  if (!session) {
    return null;
  }

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await repository.delete({ id: session.id });
    return null;
  }

  if (session.expiresAt.getTime() - now < SESSION_TTL_MS - SESSION_RENEW_AFTER_MS) {
    await repository.update({ id: session.id }, { expiresAt: new Date(now + SESSION_TTL_MS) });
  }

  return session.user;
}

export async function revokeSession({ dbConnection, token }: { dbConnection: DataSource; token: string }) {
  await dbConnection.getRepository(AuthSessionEntity).delete({ tokenHash: hashToken(token) });
}

export async function revokeUserSessions({ dbConnection, userId }: { dbConnection: DataSource; userId: string }) {
  await dbConnection
    .createQueryBuilder()
    .delete()
    .from(AuthSessionEntity)
    .where('user_id = :userId', { userId })
    .execute();
}
