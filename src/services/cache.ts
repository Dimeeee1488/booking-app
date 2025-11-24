export function getCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = parsed?.ts;
    if (!ts || typeof ts !== 'number') return null;
    if (Date.now() - ts > ttlMs) return null;
    return parsed.data as T;
  } catch {
    return null;
  }
}

export function setCache(key: string, data: any) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}



