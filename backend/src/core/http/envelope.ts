export function dataEnvelope<T>(data: T, requestId: string) {
  return {
    data,
    meta: { requestId },
  };
}

export function listEnvelope<T>(
  data: T[],
  meta: { page: number; pageSize: number; total: number; requestId: string },
) {
  return { data, meta };
}
