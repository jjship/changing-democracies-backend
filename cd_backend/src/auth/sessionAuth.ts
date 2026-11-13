import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { DataSource } from 'typeorm';
import { ENV } from '../env';
import { ForbiddenError, UnauthorizedError } from '../errors';
import { findSessionUser } from '../domain/auth/sessions';
import { SESSION_COOKIE_NAME } from './sessionCookie';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name?: string;
      role: string;
    };
  }
  interface FastifyInstance {
    authenticateSession: (request: FastifyRequest) => Promise<void>;
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type ExtractedSessionToken = { token: string; source: 'cookie' | 'header' };

/** Cookie for browsers, Bearer for scripts and tests. */
export function extractSessionToken(request: FastifyRequest): ExtractedSessionToken | null {
  const cookieToken = request.cookies[SESSION_COOKIE_NAME];
  if (cookieToken) {
    return { token: cookieToken, source: 'cookie' };
  }

  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (token) {
      return { token, source: 'header' };
    }
  }

  return null;
}

function toOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/** CSRF backstop on top of SameSite=Lax. */
export function isTrustedOrigin(request: FastifyRequest): boolean {
  const origin = request.headers.origin;
  if (origin === undefined) {
    return request.headers['sec-fetch-site'] !== 'cross-site';
  }

  const trusted = [ENV.CMS_URL, ENV.CLIENT_URL].map(toOrigin);
  return trusted.includes(origin);
}

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async (fastify: FastifyInstance, { dbConnection }: { dbConnection: DataSource }) => {
  fastify.decorate('authenticateSession', async (request: FastifyRequest) => {
    const extracted = extractSessionToken(request);
    if (!extracted) {
      throw new UnauthorizedError('Unauthorized');
    }

    if (extracted.source === 'cookie' && !SAFE_METHODS.has(request.method) && !isTrustedOrigin(request)) {
      throw new ForbiddenError('Forbidden');
    }

    const user = await findSessionUser({ dbConnection, token: extracted.token });
    if (!user) {
      throw new UnauthorizedError('Unauthorized');
    }

    request.user = { id: user.id, email: user.email, name: user.name, role: 'admin' };
  });
});
