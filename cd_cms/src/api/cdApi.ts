import { supabase } from '../lib/supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export async function cdApiRequest<T>({
  endpoint,
  options,
  retries = 3,
}: {
  endpoint: string;
  options: RequestInit;
  retries?: number;
}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const fetchWithRetry = async (attempt: number): Promise<Response> => {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundError(`Resource not found: ${endpoint}`);
        }
        throw new ApiError(`Failed to ${options.method} ${endpoint}`, response.status, response.statusText);
      }
      return response;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ApiError) {
        throw error;
      }
      if (attempt <= retries) {
        console.warn(`Retrying ${options.method} ${endpoint} (${attempt}/${retries})`);
        return fetchWithRetry(attempt + 1);
      } else {
        throw error;
      }
    }
  };

  const response = await fetchWithRetry(1);

  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json();
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    // Ensures proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public statusText: string) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
