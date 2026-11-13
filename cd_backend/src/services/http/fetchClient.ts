import { FastifyBaseLogger } from 'fastify';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type HttpRequestOptions = {
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
};

export type HttpClient = {
  get: <T>(path: string, options?: HttpRequestOptions) => Promise<T>;
  post: <T>(path: string, body?: unknown, options?: HttpRequestOptions) => Promise<T>;
  delete: <T>(path: string, options?: HttpRequestOptions) => Promise<T>;
};

export class HttpRequestError extends Error {
  readonly method: HttpMethod;
  /** origin + path only, so query secrets never reach logs */
  readonly url: string;
  /** Node/undici error code; ECONNABORTED for timeouts, as with axios */
  readonly code?: string;
  readonly status?: number;

  constructor({
    method,
    url,
    code,
    status,
    message,
    cause,
  }: {
    method: HttpMethod;
    url: string;
    code?: string;
    status?: number;
    message: string;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = 'HttpRequestError';
    this.method = method;
    this.url = url;
    this.code = code;
    this.status = status;
  }
}

export type RetryOptions = {
  retries: number;
  retryCondition?: (err: HttpRequestError) => boolean;
  retryDelayMs?: (attempt: number) => number;
};

const IDEMPOTENT_METHODS = new Set<HttpMethod>(['GET', 'PUT', 'DELETE']);

/** axios-retry's isNetworkOrIdempotentRequestError: network errors (not timeouts) for any method, 429/5xx for idempotent ones. */
export const isNetworkOrIdempotentRequestError = (err: HttpRequestError): boolean => {
  if (err.code === 'ECONNABORTED') {
    return false;
  }
  if (err.status === undefined) {
    return true;
  }
  return IDEMPOTENT_METHODS.has(err.method) && (err.status === 429 || err.status >= 500);
};

export const defaultRetry: RetryOptions = { retries: 3, retryCondition: isNetworkOrIdempotentRequestError };

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const errorCode = (err: unknown): string | undefined => {
  if (typeof err !== 'object' || err === null) {
    return undefined;
  }
  const { name, cause } = err as { name?: unknown; cause?: unknown };
  if (name === 'TimeoutError' || name === 'AbortError') {
    return 'ECONNABORTED';
  }
  if (typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string') {
    return cause.code;
  }
  return undefined;
};

const parseBody = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  const contentType = response.headers.get('content-type') ?? '';
  return (contentType.includes('application/json') ? JSON.parse(text) : text) as T;
};

export const createFetchClient = ({
  baseUrl,
  headers = {},
  timeoutMs = 30_000,
  retry = defaultRetry,
  logger,
}: {
  baseUrl: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retry?: RetryOptions;
  logger: FastifyBaseLogger;
}): HttpClient => {
  const { retries, retryCondition = isNetworkOrIdempotentRequestError, retryDelayMs = () => 0 } = retry;

  const buildUrl = (path: string, query?: HttpRequestOptions['query']) => {
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  };

  const send = async <T>(method: HttpMethod, url: URL, body: unknown, requestTimeoutMs: number): Promise<T> => {
    const safeUrl = `${url.origin}${url.pathname}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: body === undefined ? headers : { ...headers, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new HttpRequestError({
        method,
        url: safeUrl,
        code: errorCode(err),
        message: `${method} ${safeUrl} failed: ${reason}`,
        cause: err,
      });
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 200);
      throw new HttpRequestError({
        method,
        url: safeUrl,
        status: response.status,
        message: `${method} ${safeUrl} failed with status ${response.status}${detail ? `: ${detail}` : ''}`,
      });
    }

    return parseBody<T>(response);
  };

  const request = async <T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    options: HttpRequestOptions = {},
  ): Promise<T> => {
    const url = buildUrl(path, options.query);
    const requestTimeoutMs = options.timeoutMs ?? timeoutMs;

    for (let attempt = 0; ; attempt++) {
      try {
        return await send<T>(method, url, body, requestTimeoutMs);
      } catch (err) {
        if (!(err instanceof HttpRequestError) || attempt >= retries || !retryCondition(err)) {
          throw err;
        }
        logger.warn({ err, attempt: attempt + 1, retries }, 'Retrying failed request');
        await delay(retryDelayMs(attempt + 1));
      }
    }
  };

  return {
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, body, options) => request('POST', path, body, options),
    delete: (path, options) => request('DELETE', path, undefined, options),
  };
};
