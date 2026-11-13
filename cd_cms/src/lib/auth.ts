const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export type SessionUser = { id: string; email: string; name: string };

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

async function authRequest<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) {
        message = body.error;
      }
    } catch {
      // non-JSON error body
    }
    throw new AuthError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  async getSession(): Promise<SessionUser | null> {
    try {
      const { user } = await authRequest<{ user: SessionUser }>('/auth/session');
      return user;
    } catch (error) {
      if (error instanceof AuthError && error.status === 401) {
        return null;
      }
      throw error;
    }
  },

  async signIn(email: string, password: string): Promise<SessionUser> {
    const { user } = await authRequest<{ user: SessionUser }>('/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return user;
  },

  async signOut(): Promise<void> {
    await authRequest<void>('/auth/sign-out', { method: 'POST' });
  },

  async requestPasswordReset(email: string): Promise<void> {
    await authRequest<{ ok: true }>('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await authRequest<{ ok: true }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },
};
