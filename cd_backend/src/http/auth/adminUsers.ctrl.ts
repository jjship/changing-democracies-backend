import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { BadRequestError, NotFoundError } from '../../errors';
import { Mailer } from '../../services/mailer/mailer';
import { createAdminUser, deleteAdminUser, listAdminUsers } from '../../domain/auth/adminUsers';
import { buildPasswordSetupUrl, createPasswordResetToken } from '../../domain/auth/passwordReset';
import { adminUserSchema, toAdminUserDto } from './auth.schema';

export const registerAdminUsersControllers =
  (app: FastifyInstance) =>
  ({ dbConnection, mailer }: { dbConnection: DataSource; mailer: Mailer }) => {
    const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();

    typedApp.route({
      method: 'GET',
      url: '/auth/users',
      schema: { response: { 200: Type.Array(adminUserSchema) } },
      handler: async (_req, reply) => {
        const users = await listAdminUsers({ dbConnection });
        return reply.send(users.map(toAdminUserDto));
      },
    });

    typedApp.route({
      method: 'POST',
      url: '/auth/users',
      schema: {
        body: Type.Object({
          email: Type.String({ format: 'email', maxLength: 254 }),
          name: Type.String({ minLength: 1, maxLength: 200 }),
        }),
        response: { 201: Type.Intersect([adminUserSchema, Type.Object({ inviteSent: Type.Boolean() })]) },
      },
      handler: async (req, reply) => {
        const user = await createAdminUser({ dbConnection, email: req.body.email, name: req.body.name });
        const { token } = await createPasswordResetToken({ dbConnection, user });

        let inviteSent = true;
        try {
          await mailer.sendPasswordSetup({
            to: user.email,
            name: user.name,
            url: buildPasswordSetupUrl(token),
            kind: 'invite',
          });
        } catch (err) {
          inviteSent = false;
          req.log.error({ err }, 'Failed to send invite email');
        }

        return reply.status(201).send({ ...toAdminUserDto(user), inviteSent });
      },
    });

    typedApp.route({
      method: 'DELETE',
      url: '/auth/users/:id',
      schema: { params: Type.Object({ id: Type.String({ format: 'uuid' }) }) },
      handler: async (req, reply) => {
        if (req.user?.id === req.params.id) {
          throw new BadRequestError('You cannot delete your own account');
        }

        const deleted = await deleteAdminUser({ dbConnection, id: req.params.id });
        if (!deleted) {
          throw new NotFoundError('User not found');
        }

        return reply.status(204).send();
      },
    });
  };
