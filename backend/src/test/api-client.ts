import { runtimeBaseUrl } from './runtime-env.js';

export interface RuntimeApiClientOptions {
  readonly baseUrl?: string;
  readonly accessToken?: string;
  readonly tenantId?: string;
  readonly membershipId?: string;
  readonly defaultHeaders?: Record<string, string>;
}

export interface RuntimeRequestOptions {
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
}

export interface RuntimeApiResponse<T = unknown> {
  readonly status: number;
  readonly ok: boolean;
  readonly headers: Headers;
  readonly body: T;
}

export class RuntimeApiClient {
  private readonly baseUrl: string;
  private readonly accessToken?: string;
  private readonly tenantId?: string;
  private readonly membershipId?: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: RuntimeApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? runtimeBaseUrl()).replace(/\/$/, '');
    this.accessToken = options.accessToken;
    this.tenantId = options.tenantId;
    this.membershipId = options.membershipId;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  withAuth(accessToken: string, tenantId?: string, membershipId?: string) {
    return new RuntimeApiClient({
      baseUrl: this.baseUrl,
      accessToken,
      tenantId: tenantId ?? this.tenantId,
      membershipId: membershipId ?? this.membershipId,
      defaultHeaders: this.defaultHeaders,
    });
  }

  async request<T = unknown>(method: string, path: string, options: RuntimeRequestOptions = {}): Promise<RuntimeApiResponse<T>> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      ...this.defaultHeaders,
      ...options.headers,
    };
    if (this.accessToken) headers.authorization = `Bearer ${this.accessToken}`;
    if (this.tenantId) headers['x-nexora-tenant'] = this.tenantId;
    if (this.membershipId) headers['x-nexora-membership'] = this.membershipId;
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;

    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`, init);
    const text = await response.text();
    const body = text.length ? JSON.parse(text) : null;
    return { status: response.status, ok: response.ok, headers: response.headers, body: body as T };
  }

  get<T = unknown>(path: string, options?: RuntimeRequestOptions) {
    return this.request<T>('GET', path, options);
  }

  post<T = unknown>(path: string, body?: unknown, options: Omit<RuntimeRequestOptions, 'body'> = {}) {
    return this.request<T>('POST', path, { ...options, body });
  }

  patch<T = unknown>(path: string, body?: unknown, options: Omit<RuntimeRequestOptions, 'body'> = {}) {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  delete<T = unknown>(path: string, options?: RuntimeRequestOptions) {
    return this.request<T>('DELETE', path, options);
  }
}
