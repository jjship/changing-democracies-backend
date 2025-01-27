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

      if (!response.ok) throw new Error(`Failed to ${options.method} ${endpoint}`);
      return response;
    } catch (error) {
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
