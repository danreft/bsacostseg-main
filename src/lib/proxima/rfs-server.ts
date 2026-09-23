import 'server-only';

// Mirrors the existing submission/list REST infrastructure; credentials never leave the server.
export function rfsServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('RFS is not configured');
  return { url, secret };
}
export async function rfsGet<T>(table: string, query: URLSearchParams): Promise<T[]> {
  const { url, secret } = rfsServerConfig();
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: secret }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('RFS data could not be loaded');
  return response.json();
}
