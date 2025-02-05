import 'fastify';

import { SupabaseJWTPayload } from '../auth/jwtAuth';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}
