const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}
