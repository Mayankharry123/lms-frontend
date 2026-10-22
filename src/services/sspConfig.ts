const configuredSspApiBaseUrl = String(
  (typeof globalThis !== 'undefined' && (globalThis as any).VITE_SSP_API_BASE_URL) ||
    import.meta.env.VITE_SSP_API_BASE_URL ||
    ''
)
  .trim()
  .replace(/\/+$/, '');

export const SSP_API_KEY = String(
  (typeof globalThis !== 'undefined' && (globalThis as any).VITE_SSP_API_KEY) ||
    import.meta.env.VITE_SSP_API_KEY ||
    ''
).trim();

export const SSP_BEARER_TOKEN = String(
  (typeof globalThis !== 'undefined' && (globalThis as any).VITE_SSP_BEARER_TOKEN) ||
    import.meta.env.VITE_SSP_BEARER_TOKEN ||
    ''
).trim();

/** In dev use the Vite `/ssp-api` proxy; in production use the configured absolute base URL. */
export function resolveSspBaseUrl(): string {
  if (import.meta.env.DEV) {
    return '/ssp-api';
  }
  return configuredSspApiBaseUrl || '/ssp-api';
}

export function applySspAuthHeaders(
  headers: Record<string, string> = {}
): Record<string, string> {
  const next: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (SSP_BEARER_TOKEN) {
    next.Authorization = `Bearer ${SSP_BEARER_TOKEN}`;
  }

  if (SSP_API_KEY) {
    next['X-API-Key'] = SSP_API_KEY;
    next['X-DGPlay-Api-Key'] = SSP_API_KEY;
  }

  return next;
}
