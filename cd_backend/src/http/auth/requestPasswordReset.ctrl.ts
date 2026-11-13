import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { DataSource } from 'typeorm';
import { Mailer } from '../../services/mailer/mailer';
import { findAdminUserByEmail } from '../../domain/auth/adminUsers';
import { buildPasswordSetupUrl, createPasswordResetToken } from '../../domain/auth/passwordReset';
import { okSchema } from './auth.schema';

export const registerRequestPasswordResetController =
  (app: FastifyInstance) =>
  ({ dbConnection, mailer }: { dbConnection: DataSource; mailer: Mailer }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'POST',
      url: '/auth/request-password-reset',
      config: { rateLimit: { max: 3, timeWindow: '10 minutes' } },
      schema: {
        body: Type.Object({ email: Type.String({ format: 'email', maxLength: 254 }) }),
        response: { 200: okSchema },
      },
      handler: async (req, reply) => {
        const user = await findAdminUserByEmail({ dbConnection, email: req.body.email });

        // Same response whether or not the account exists.
        if (user) {
          const { token } = await createPasswordResetToken({ dbConnection, user });
          try {
            await mailer.sendPasswordSetup({
              to: user.email,
              name: user.name,
              url: buildPasswordSetupUrl(token),
              kind: 'reset',
            });
          } catch (err) {
            req.log.error({ err }, 'Failed to send password reset email');
          }
        }

        return reply.status(200).send({ ok: true });
      },
    });
  };
