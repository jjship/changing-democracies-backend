import { Type } from '@fastify/type-provider-typebox';
import { AdminUserEntity } from '../../db/entities/AdminUser';

export const sessionUserSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
});

export const adminUserSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  createdAt: Type.String(),
  hasPassword: Type.Boolean(),
});

export const okSchema = Type.Object({ ok: Type.Literal(true) });

export function toAdminUserDto(user: AdminUserEntity) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    hasPassword: user.passwordHash !== null,
  };
}
