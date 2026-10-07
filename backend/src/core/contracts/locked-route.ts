import {
  API_BASE_PATH,
  requireLockedEndpoint,
  type LockedHttpMethod,
} from '@nexora/shared';

type JsonSchema = Record<string, unknown>;

function pathParamsSchema(fullPath: string): JsonSchema | undefined {
  const names = [...fullPath.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]!);
  if (!names.length) return undefined;
  return {
    type: 'object',
    additionalProperties: false,
    required: names,
    properties: Object.fromEntries(names.map((name) => [name, { type: 'string', minLength: 1 }])),
  };
}

function genericRequestObject(): JsonSchema {
  return { type: 'object', additionalProperties: true };
}

function genericResponseEnvelope(): JsonSchema {
  return {
    type: 'object',
    required: ['data', 'meta'],
    additionalProperties: false,
    properties: {
      data: {},
      meta: {
        type: 'object',
        required: ['requestId'],
        additionalProperties: true,
        properties: { requestId: { type: 'string' } },
      },
    },
  };
}

function genericErrorEnvelope(): JsonSchema {
  return {
    type: 'object',
    required: ['error'],
    additionalProperties: false,
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message', 'requestId'],
        additionalProperties: true,
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          details: {},
          requestId: { type: 'string' },
        },
      },
    },
  };
}

function openApiSchema(
  method: LockedHttpMethod,
  fullPath: string,
  contract: ReturnType<typeof requireLockedEndpoint>,
) {
  const params = pathParamsSchema(fullPath);
  const requestBodyAllowed = !['GET', 'HEAD'].includes(method);

  return {
    operationId: `${method.toLowerCase()}_${fullPath
      .replace(API_BASE_PATH, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`,
    summary: contract.purpose,
    description: [
      contract.notes || undefined,
      `Locked catalog permission: ${contract.permission || 'Public/contract-specific'}.`,
      'Field-level JSON Schema is intentionally generic when the source PDF does not print a complete shared payload contract; Zod contracts remain the validation authority where defined.',
    ].filter(Boolean).join(' '),
    tags: [contract.area],
    ...(params ? { params } : {}),
    ...(method === 'GET' ? { querystring: genericRequestObject() } : {}),
    ...(requestBodyAllowed ? { body: genericRequestObject() } : {}),
    response: {
      200: genericResponseEnvelope(),
      201: genericResponseEnvelope(),
      400: genericErrorEnvelope(),
      401: genericErrorEnvelope(),
      403: genericErrorEnvelope(),
      404: genericErrorEnvelope(),
      409: genericErrorEnvelope(),
      429: genericErrorEnvelope(),
      500: genericErrorEnvelope(),
    },
    'x-nexora-contract-source': contract.source,
    'x-nexora-permission': contract.permission || null,
  } as const;
}

export function defineLockedRoute(method: LockedHttpMethod, fullPath: string) {
  const contract = requireLockedEndpoint(method, fullPath);

  if (!fullPath.startsWith(API_BASE_PATH)) {
    throw new Error(`Locked route must start with ${API_BASE_PATH}: ${fullPath}`);
  }

  const relativePath = fullPath.slice(API_BASE_PATH.length) || '/';

  return Object.freeze({
    contract,
    fullPath,
    relativePath,
    schema: openApiSchema(method, fullPath, contract),
  });
}
