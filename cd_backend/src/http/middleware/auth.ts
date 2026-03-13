import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { ENV } from '../../env';

// eslint-disable-next-line @typescript-eslint/naming-convention
interface SupabaseJWT {
  aud: string;
  exp: number;
  sub: string;
  email: string;
  role: string;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.SUPABASE_JWT_SECRET) as SupabaseJWT;

    // Add user info to request for use in controllers
    request.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (err) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: err instanceof Error ? err.message : 'Authentication failed',
    });
  }
}
