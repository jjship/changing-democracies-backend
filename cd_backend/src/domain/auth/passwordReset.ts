import { DataSource } from 'typeorm';
import { AdminUserEntity } from '../../db/entities/AdminUser';
import { PasswordResetTokenEntity } from '../../db/entities/PasswordResetToken';
import { generateToken, hashToken } from '../../auth/tokens';
import { ENV } from '../../env';

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export async function createPasswordResetToken({
  dbConnection,
  user,
}: {
  dbConnection: DataSource;
  user: AdminUserEntity;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();

  const resetToken = new PasswordResetTokenEntity();
  resetToken.tokenHash = hashToken(token);
  resetToken.user = user;
  resetToken.expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  resetToken.usedAt = null;

  await dbConnection.getRepository(PasswordResetTokenEntity).save(resetToken);

  return { token, expiresAt: resetToken.expiresAt };
}

export async function consumePasswordResetToken({
  dbConnection,
  token,
}: {
  dbConnection: DataSource;
  token: string;
}): Promise<AdminUserEntity | null> {
  return dbConnection.transaction(async (entityManager) => {
    const repository = entityManager.getRepository(PasswordResetTokenEntity);
    const resetToken = await repository.findOne({ where: { tokenHash: hashToken(token) }, relations: { user: true } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    resetToken.usedAt = new Date();
    await repository.save(resetToken);

    return resetToken.user;
  });
}

export function buildPasswordSetupUrl(token: string): string {
  return `${new URL(ENV.CMS_URL).origin}/reset-password?token=${encodeURIComponent(token)}`;
}
