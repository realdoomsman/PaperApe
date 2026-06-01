import type { ApiResponse } from '@paperape/shared';
import { getApiBase } from './config';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000, 2000]; // exponential backoff
const TIMEOUT_MS = 10000;

async function sleep(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function shouldRetry(method: string, status?: number) {
  if (status && status >= 400 && status < 500) return false;
  return method.toUpperCase() === 'GET';
}

async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const json = await res.json();
    return { status: res.status, ...json };
  }

  const text = await res.text();
  return {
    success: false,
    status: res.status,
    error: text.trim() || `Request failed with status ${res.status}`,
  };
}

export async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<ApiResponse<T>> {
  if (method.toUpperCase() !== 'GET' && !token) {
    return { success: false, status: 401, error: 'Sign in required' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${getApiBase()}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (res.status >= 500 && attempt < MAX_RETRIES - 1 && shouldRetry(method, res.status)) {
        await sleep(RETRY_DELAYS[attempt] || 2000);
        continue;
      }

      const parsed = await parseApiResponse<T>(res);
      if (res.status === 401) {
        return { ...parsed, success: false, error: parsed.error || 'Sign in required' };
      }
      return parsed;
    } catch (err: any) {
      if (attempt < MAX_RETRIES - 1 && shouldRetry(method)) {
        await sleep(RETRY_DELAYS[attempt] || 2000);
        continue;
      }

      if (err.name === 'AbortError') {
        return { success: false, error: 'Request timed out' };
      }

      return { success: false, error: err.message || 'Network error' };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}
