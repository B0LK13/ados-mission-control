/**
 * Loopback host policy for opt-in mutation POSTs (CSRF residual control).
 * Default: mutations require Host to be loopback unless explicitly allowed remote.
 */

/** Strip port / IPv6 brackets from a Host header or hostname. */
export function normalizeHost(hostHeader: string): string {
  const raw = hostHeader.trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    return end === -1 ? raw : raw.slice(1, end);
  }
  // Bare IPv6 has multiple colons — do not treat the last segment as a port.
  if ((raw.match(/:/g) || []).length > 1) return raw;
  // hostname:port or ipv4:port — only strip when the suffix is a numeric port
  const colon = raw.lastIndexOf(":");
  if (colon > -1 && /^\d+$/.test(raw.slice(colon + 1))) {
    return raw.slice(0, colon);
  }
  return raw;
}

export function isLoopbackHost(hostHeader: string | null): boolean {
  if (!hostHeader) return false;
  const host = normalizeHost(hostHeader);
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function remoteMutationsAllowed(): boolean {
  return process.env.MISSION_CONTROL_ALLOW_REMOTE_MUTATIONS?.trim().toLowerCase() === "enabled";
}

/**
 * Returns true when the mutation request is permitted by host policy.
 */
export function mutationHostAllowed(hostHeader: string | null): boolean {
  if (remoteMutationsAllowed()) return true;
  return isLoopbackHost(hostHeader);
}

/** Prefer Host header; fall back to URL hostname (unit tests / atypical clients). */
export function requestHost(request: { headers: { get(name: string): string | null }; nextUrl: { hostname: string } }): string | null {
  return request.headers.get("host") || request.nextUrl.hostname || null;
}
