import { CookieSerializeOptions } from '@fastify/cookie';
import { ENV } from '../env';

export const SESSION_COOKIE_NAME = 'cd_session';

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

/** Common parent domain of the CMS and API hosts; host-only when they match. */
export function deriveCookieDomain({
  cmsUrl,
  backendUrl,
  override,
}: {
  cmsUrl: string;
  backendUrl: string;
  override?: string;
}): string | undefined {
  if (override) {
    return override;
  }

  const cmsHost = safeHostname(cmsUrl);
  const apiHost = safeHostname(backendUrl);
  if (!cmsHost || !apiHost || cmsHost === apiHost) {
    return undefined;
  }

  const cmsLabels = cmsHost.split('.');
  const apiLabels = apiHost.split('.');
  const common: string[] = [];
  let i = cmsLabels.length - 1;
  let j = apiLabels.length - 1;
  while (i >= 0 && j >= 0 && cmsLabels[i] === apiLabels[j]) {
    common.unshift(cmsLabels[i]);
    i--;
    j--;
  }

  // at least a registrable domain, never a bare TLD
  return common.length >= 2 ? common.join('.') : undefined;
}

function baseCookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: true,
    secure: ENV.BACKEND_URL.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    domain: deriveCookieDomain({ cmsUrl: ENV.CMS_URL, backendUrl: ENV.BACKEND_URL, override: ENV.AUTH_COOKIE_DOMAIN }),
  };
}

export function sessionCookieOptions({ expiresAt }: { expiresAt: Date }): CookieSerializeOptions {
  return { ...baseCookieOptions(), expires: expiresAt };
}

export function clearSessionCookieOptions(): CookieSerializeOptions {
  return baseCookieOptions();
}
