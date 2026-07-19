const redactionPatterns: Array<[RegExp, string]> = [
  [/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/gi, "[REDACTED_PRIVATE_KEY]"],
  [/\b(?:sk|pk)-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_API_KEY]"],
  [/\b(?:ghp|github_pat|glpat)-[A-Za-z0-9_-]{12,}\b/gi, "[REDACTED_ACCESS_TOKEN]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [REDACTED]"],
  [/\bBasic\s+[A-Za-z0-9+/=]{8,}/gi, "Basic [REDACTED]"],
  [
    /\b(password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|set-cookie)\b\s*[:=]\s*[^\s,;]+/gi,
    "$1=[REDACTED]",
  ],
  [
    /\b(?:Server|Data Source)=[^\r\n]+?;(?:[^\r\n;]+;)*(?:Password|Pwd)=[^\r\n;]+;?/gi,
    "[REDACTED_CONNECTION_STRING]",
  ],
  [/([?&](?:access_token|api_key|key|secret|signature|sig|token)=)[^&#\s]+/gi, "$1[REDACTED]"],
  [/C:\\Users\\[^\\\s]+/gi, "C:\\Users\\[USER]"],
];

/**
 * Exact normalized keys always replaced (false-negative protection beyond regex shapes).
 */
const FORCE_REDACT_EXACT = new Set([
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "apikey",
  "authorization",
  "cookie",
  "setcookie",
  "privatekey",
  "clientsecret",
  "refreshtoken",
  "accesstoken",
  "signingkey",
  "credential",
  "credentials",
  "session",
  "sessionid",
  "authheader",
  "xapikey",
]);

/** Affixes that mark a key as secret-bearing without matching unrelated words (e.g. possession). */
const FORCE_REDACT_AFFIXES = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "privatekey",
  "clientsecret",
  "refreshtoken",
  "accesstoken",
  "signingkey",
  "authorization",
  "cookie",
  "sessionid",
  "authheader",
  "credential",
  "credentials",
] as const;

/**
 * Container keys that hold high-risk envelopes. Inside these objects, only
 * {@link HIGH_RISK_FIELD_ALLOWLIST} keys may retain values (still pattern-redacted).
 */
const HIGH_RISK_CONTAINER_KEYS = new Set([
  "headers",
  "auth",
  "credentials",
  "secrets",
  "env",
  "environment",
  "tokens",
  "keys",
  "cookies",
  "connection",
  "connections",
]);

/**
 * Allowlisted field names permitted inside high-risk containers.
 * Unknown fields become `[REDACTED_UNLISTED_FIELD]` so novel secret shapes cannot pass.
 */
const HIGH_RISK_FIELD_ALLOWLIST = new Set([
  "mode",
  "scheme",
  "type",
  "status",
  "role",
  "path",
  "exists",
  "count",
  "id",
  "name",
  "code",
  "message",
  "timestamp",
  "algorithm",
  "issuer",
  "audience",
  "expiresat",
  "issuedat",
  "reachable",
  "stale",
]);

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isForceRedactKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (FORCE_REDACT_EXACT.has(normalized)) return true;
  return FORCE_REDACT_AFFIXES.some(
    (affix) => normalized.startsWith(affix) || normalized.endsWith(affix),
  );
}

export function isHighRiskContainerKey(key: string): boolean {
  return HIGH_RISK_CONTAINER_KEYS.has(normalizeKey(key));
}

export function isAllowlistedHighRiskField(key: string): boolean {
  return HIGH_RISK_FIELD_ALLOWLIST.has(normalizeKey(key));
}

export function redactText(value: string): string {
  return redactionPatterns.reduce(
    (redacted, [pattern, replacement]) => redacted.replace(pattern, replacement),
    value,
  );
}

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[REDACTED_DEPTH_LIMIT]";
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => {
      if (isForceRedactKey(key)) {
        return [key, "[REDACTED]"];
      }
      return [key, redactValue(child, depth + 1)];
    }),
  );
}

/**
 * Schema-aware redaction for high-risk envelopes (support bundles, auth-bearing diagnostics).
 * Applies {@link redactValue}, then under high-risk containers drops unlisted fields.
 */
export function redactHighRiskEnvelope(value: unknown, depth = 0, insideHighRisk = false): unknown {
  if (depth > 8) return "[REDACTED_DEPTH_LIMIT]";
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactHighRiskEnvelope(item, depth + 1, insideHighRisk));
  }
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => {
      // High-risk containers are walked with allowlisting even when the container
      // name overlaps a force-redact affix (e.g. credentials, tokens).
      if (isHighRiskContainerKey(key)) {
        return [key, redactHighRiskEnvelope(child, depth + 1, true)];
      }
      if (isForceRedactKey(key)) {
        return [key, "[REDACTED]"];
      }
      if (insideHighRisk && !isAllowlistedHighRiskField(key)) {
        return [key, "[REDACTED_UNLISTED_FIELD]"];
      }
      return [key, redactHighRiskEnvelope(child, depth + 1, insideHighRisk)];
    }),
  );
}

export function safeSummary(value: unknown, fallback: string, maxLength = 240): string {
  const source = typeof value === "string" && value.trim() ? value.trim() : fallback;
  const redacted = redactText(source).replace(/\s+/g, " ");
  return redacted.length > maxLength ? `${redacted.slice(0, maxLength - 1)}…` : redacted;
}
