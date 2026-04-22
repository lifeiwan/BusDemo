import { auth } from '../firebase';

const BASE = import.meta.env.VITE_API_URL as string;

// snake_case ↔ camelCase helpers
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toSnake(s: string): string {
  return s.replace(/([A-Z])/g, c => '_' + c.toLowerCase());
}

function deepTransform(obj: unknown, fn: (k: string) => string): unknown {
  if (Array.isArray(obj)) return obj.map(v => deepTransform(v, fn));
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .map(([k, v]) => [fn(k), deepTransform(v, fn)])
    );
  }
  return obj;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await auth.currentUser?.getIdToken();

  // Convert camelCase request body to snake_case for the backend
  let body = options.body;
  if (typeof body === 'string') {
    body = JSON.stringify(deepTransform(JSON.parse(body), toSnake));
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;

  const data = await res.json();
  return deepTransform(data, toCamel) as T;
}
