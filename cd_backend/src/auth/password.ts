import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

// OWASP-recommended scrypt parameters
const SCRYPT_N = 2 ** 16;
const SCRYPT_R = 8;
const SCRYPT_P = 2;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_MAX_MEM = 128 * 1024 * 1024;

function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  params: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, { ...params, maxmem: SCRYPT_MAX_MEM }, (err, derivedKey) =>
      err ? reject(err) : resolve(derivedKey),
    );
  });
}

/** scrypt$N$r$p$salt$key, base64 fields */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });

  return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64'), key.toString('base64')].join('$');
}

/** Constant-time; hashes even without a stored hash so timing does not reveal the account. */
export async function verifyPassword(password: string, storedHash: string | null): Promise<boolean> {
  if (!storedHash) {
    await hashPassword(password);
    return false;
  }

  const [algorithm, n, r, p, saltBase64, keyBase64] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !n || !r || !p || !saltBase64 || !keyBase64) {
    return false;
  }

  const expected = Buffer.from(keyBase64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltBase64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
