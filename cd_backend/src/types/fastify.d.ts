import 'fastify';
import { SupabaseJWTPayload } from '../plugins/auth';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      role: string;
    };
  }
}
