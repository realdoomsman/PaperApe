const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000, 2000]; // exponential backoff
const TIMEOUT_MS = 10000;

export async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Don't retry on client errors (4xx), only on server errors (5xx)
      if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 2000));
        continue;
      }

      const json = await res.json();
      return json;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 2000));
          continue;
        }
        return { success: false, error: 'Request timed out' };
      }

      // Network error — retry
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 2000));
        continue;
      }

      return { success: false, error: err.message || 'Network error' };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}
