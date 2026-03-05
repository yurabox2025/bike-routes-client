function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL;
  if (explicit && explicit.trim().length > 0) {
    return normalizeBaseUrl(explicit.trim());
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:4000';
  }

  // Production fallback for same-origin deploy (client and server under one domain).
  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();
