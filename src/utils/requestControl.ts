export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { name?: string; code?: string; message?: string };
  return (
    err.name === 'CanceledError' ||
    err.name === 'AbortError' ||
    err.code === 'ERR_CANCELED' ||
    err.code === 'ERR_CANCELED'.toLowerCase() ||
    String(err.message || '').toLowerCase().includes('canceled')
  );
}

export function serializeRequestKey(value: unknown): string {
  return JSON.stringify(value ?? {});
}
