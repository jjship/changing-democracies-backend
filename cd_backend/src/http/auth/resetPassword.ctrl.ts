import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { BadRequestError } from '../../errors';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../auth/password';
import { setAdminUserPassword } from '../../domain/auth/adminUsers';
import { consumePasswordResetToken } from '../../domain/auth/passwordReset';
import { revokeUserSessions } from '../../domain/auth/sessions';
import { okSchema } from './auth.schema';

export const registerResetPasswordController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/auth/reset-password',
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        body: Type.Object({
          token: Type.String({ minLength: 1, maxLength: 256 }),
          password: Type.String({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH }),
        }),
        response: { 200: okSchema },
      },
      handler: async (req, reply) => {
        const user = await consumePasswordResetToken({ dbConnection, token: req.body.token });
        if (!user) {
          throw new BadRequestError('Invalid or expired token');
        }

        await setAdminUserPassword({ dbConnection, userId: user.id, password: req.body.password });
        await revokeUserSessions({ dbConnection, userId: user.id });

        return reply.status(200).send({ ok: true });
      },
    });
  };
