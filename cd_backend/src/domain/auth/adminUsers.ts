import { DataSource } from 'typeorm';
import { AdminUserEntity } from '../../db/entities/AdminUser';
import { HttpError } from '../../errors';
import { hashPassword } from '../../auth/password';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createAdminUser({
  dbConnection,
  email,
  name,
  password,
}: {
  dbConnection: DataSource;
  email: string;
  name: string;
  password?: string;
}): Promise<AdminUserEntity> {
  const repository = dbConnection.getRepository(AdminUserEntity);
  const normalizedEmail = normalizeEmail(email);

  const existing = await repository.findOneBy({ email: normalizedEmail });
  if (existing) {
    throw new HttpError('User already exists', 409);
  }

  const user = repository.create({
    email: normalizedEmail,
    name: name.trim(),
    passwordHash: password ? await hashPassword(password) : null,
  });

  return repository.save(user);
}

export async function findAdminUserByEmail({
  dbConnection,
  email,
}: {
  dbConnection: DataSource;
  email: string;
}): Promise<AdminUserEntity | null> {
  return dbConnection.getRepository(AdminUserEntity).findOneBy({ email: normalizeEmail(email) });
}

export async function findAdminUserById({
  dbConnection,
  id,
}: {
  dbConnection: DataSource;
  id: string;
}): Promise<AdminUserEntity | null> {
  return dbConnection.getRepository(AdminUserEntity).findOneBy({ id });
}

export async function listAdminUsers({ dbConnection }: { dbConnection: DataSource }): Promise<AdminUserEntity[]> {
  return dbConnection.getRepository(AdminUserEntity).find({ order: { createdAt: 'ASC' } });
}

export async function deleteAdminUser({
  dbConnection,
  id,
}: {
  dbConnection: DataSource;
  id: string;
}): Promise<boolean> {
  const result = await dbConnection.getRepository(AdminUserEntity).delete({ id });
  return (result.affected ?? 0) > 0;
}

export async function setAdminUserPassword({
  dbConnection,
  userId,
  password,
}: {
  dbConnection: DataSource;
  userId: string;
  password: string;
}) {
  await dbConnection
    .getRepository(AdminUserEntity)
    .update({ id: userId }, { passwordHash: await hashPassword(password) });
}
