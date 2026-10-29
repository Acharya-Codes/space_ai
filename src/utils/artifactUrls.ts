/** Resolve backend artifact paths against the API base, never the frontend origin. */
export function resolveArtifactUrl(rawUrl: string | null, apiBaseUrl: string): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const value = rawUrl.trim();
  const isAbsoluteHttp = /^https?:\/\//i.test(value);
  if (!isAbsoluteHttp && (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//'))) return null;
  try {
    const resolved = isAbsoluteHttp ? new URL(value) : new URL(value, `${apiBaseUrl.replace(/\/+$/, '')}/`);
    if (resolved.protocol !== 'https:' && resolved.protocol !== 'http:') return null;
    if (!isAbsoluteHttp && !apiBaseUrl) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}
