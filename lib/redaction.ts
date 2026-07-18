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
      if (/password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|private[_-]?key/i.test(key)) {
        return [key, "[REDACTED]"];
      }
      return [key, redactValue(child, depth + 1)];
    }),
  );
}

export function safeSummary(value: unknown, fallback: string, maxLength = 240): string {
  const source = typeof value === "string" && value.trim() ? value.trim() : fallback;
  const redacted = redactText(source).replace(/\s+/g, " ");
  return redacted.length > maxLength ? `${redacted.slice(0, maxLength - 1)}…` : redacted;
}
