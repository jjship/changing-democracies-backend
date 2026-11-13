import { createHash, randomBytes } from 'crypto';

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Tokens are stored hashed. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
