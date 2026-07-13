function isUnsafeHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)
    || normalized.includes(':');
}

export function safeExternalUrl(value?: string | null): string | undefined {
  const candidate = String(value || '').trim();
  if (!candidate) return undefined;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') return undefined;
    if (!parsed.hostname || parsed.username || parsed.password || parsed.port && parsed.port !== '443') {
      return undefined;
    }
    if (isUnsafeHost(parsed.hostname)) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}
