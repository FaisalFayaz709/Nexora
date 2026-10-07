import { API_BASE_PATH } from '@nexora/shared';
import { apiBaseUrl } from './api-base';

export type ApiPrimitive = string | number | boolean | null | undefined;
export type ApiQueryParams = Record<string, ApiPrimitive | ApiPrimitive[]>;

export type ApiMeta = {
  requestId?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  [key: string]: unknown;
};

export type ApiSingleEnvelope<T> = {
  data: T;
  meta?: ApiMeta;
};

export type ApiListEnvelope<T> = {
  data: T[];
  meta: ApiMeta & { page?: number; pageSize?: number; total?: number };
};

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
  };
};

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  query?: ApiQueryParams;
  idempotencyKey?: string;
  skipJsonContentType?: boolean;
};

let accessToken: string | null = null;
let organizationId: string | null = null;

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(input: { message: string; code: string; status: number; details?: unknown; requestId?: string | null }) {
    super(input.message);
    this.name = 'ApiClientError';
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
    this.requestId = input.requestId ?? null;
  }
}

export function setAccessToken(value: string | null) {
  accessToken = value;
}

export function setOrganizationId(value: string | null) {
  organizationId = value;
  if (typeof window !== 'undefined') {
    if (value) window.localStorage.setItem('nexora.organizationId', value);
    else window.localStorage.removeItem('nexora.organizationId');
  }
}

export function restoreOrganizationId() {
  if (typeof window !== 'undefined' && !organizationId) {
    organizationId = window.localStorage.getItem('nexora.organizationId');
  }
  return organizationId;
}

export function getOrganizationId() {
  return organizationId ?? restoreOrganizationId();
}

export function createRequestId(prefix = 'req') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createIdempotencyKey(prefix = 'cmd') {
  return createRequestId(prefix);
}

export function buildQueryString(query?: ApiQueryParams) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(query)) {
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) if (value !== undefined && value !== null) params.append(key, String(value));
    } else if (rawValue !== undefined && rawValue !== null) {
      params.set(key, String(rawValue));
    }
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function toApiPath(path: string, query?: ApiQueryParams) {
  const cleanPath = path.startsWith(API_BASE_PATH) ? path.slice(API_BASE_PATH.length) || '/' : path;
  const prefixed = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return `${prefixed}${buildQueryString(query)}`;
}

function isFormDataLike(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function normalizeBody(body: ApiRequestOptions['body']) {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string' || body instanceof Blob || body instanceof ArrayBuffer || isFormDataLike(body)) return body;
  return JSON.stringify(body);
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { query, idempotencyKey, skipJsonContentType, body: rawBody, ...init } = options;
  const headers = new Headers(init.headers);
  const body = normalizeBody(rawBody);

  if (body && !skipJsonContentType && !isFormDataLike(rawBody) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  const org = getOrganizationId();
  if (org) headers.set('x-organization-id', org);
  if (idempotencyKey && !headers.has('Idempotency-Key')) headers.set('Idempotency-Key', idempotencyKey);
  if (!headers.has('x-request-id')) headers.set('x-request-id', createRequestId());

  const response = await fetch(`${apiBaseUrl}${toApiPath(path, query)}`, {
    ...init,
    body,
    headers,
    credentials: 'include',
  });

  const parsed = await parseResponse(response);
  if (!response.ok) {
    const errorBody = parsed as ApiErrorBody | null;
    const message = errorBody?.error?.message ?? `Request failed (${response.status})`;
    throw new ApiClientError({
      message,
      code: errorBody?.error?.code ?? 'API_REQUEST_FAILED',
      status: response.status,
      details: errorBody?.error?.details,
      requestId: errorBody?.error?.requestId ?? response.headers.get('x-request-id'),
    });
  }

  return parsed as T;
}

export function apiGet<T>(path: string, query?: ApiQueryParams) {
  return apiRequest<T>(path, { method: 'GET', query });
}

export function apiPost<T>(path: string, body?: ApiRequestOptions['body'], options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
  return apiRequest<T>(path, { ...options, method: 'POST', body });
}

export function apiPut<T>(path: string, body?: ApiRequestOptions['body'], options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
  return apiRequest<T>(path, { ...options, method: 'PUT', body });
}

export function apiPatch<T>(path: string, body?: ApiRequestOptions['body'], options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
  return apiRequest<T>(path, { ...options, method: 'PATCH', body });
}

export function apiDelete<T>(path: string, options: Omit<ApiRequestOptions, 'method'> = {}) {
  return apiRequest<T>(path, { ...options, method: 'DELETE' });
}
