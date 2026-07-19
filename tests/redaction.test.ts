import assert from "node:assert/strict";
import test from "node:test";
import {
  redactHighRiskEnvelope,
  redactText,
  redactValue,
  safeSummary,
} from "../lib/redaction";

test("redacts bearer tokens and API keys", () => {
  const source = "Authorization: Bearer abcdefghijklmnop and sk-exampleSecret12345";
  const redacted = redactText(source);

  assert.equal(redacted.includes("abcdefghijklmnop"), false);
  assert.equal(redacted.includes("sk-exampleSecret12345"), false);
  assert.match(redacted, /REDACTED/);
});

test("safe summaries collapse whitespace and enforce a limit", () => {
  const summary = safeSummary(`  ${"mission ".repeat(80)}  `, "fallback", 80);

  assert.equal(summary.length, 80);
  assert.equal(summary.endsWith("…"), true);
  assert.equal(summary.includes("  "), false);
});

test("force-redacts novel secret key names that regex values would miss", () => {
  const value = redactValue({
    clientSecret: "plain-secret-without-prefix",
    nested: { refresh_token: "rt-not-matched-by-sk-pattern" },
  }) as Record<string, unknown>;
  assert.equal(value.clientSecret, "[REDACTED]");
  assert.equal((value.nested as Record<string, unknown>).refresh_token, "[REDACTED]");
  assert.doesNotMatch(JSON.stringify(value), /plain-secret|rt-not-matched/);
});

test("high-risk envelopes allowlist fields inside credentials/headers containers", () => {
  const value = redactHighRiskEnvelope({
    credentials: {
      type: "service",
      novelProviderKey: "super-secret-value-xyz",
      password: "should-already-force-redact",
    },
    headers: {
      status: "ok",
      "X-Custom-Auth": "leaked-header-value",
    },
    safeTopLevel: "visible",
  }) as Record<string, unknown>;

  const credentials = value.credentials as Record<string, unknown>;
  const headers = value.headers as Record<string, unknown>;
  assert.equal(credentials.type, "service");
  assert.equal(credentials.novelProviderKey, "[REDACTED_UNLISTED_FIELD]");
  assert.equal(credentials.password, "[REDACTED]");
  assert.equal(headers.status, "ok");
  assert.equal(headers["X-Custom-Auth"], "[REDACTED_UNLISTED_FIELD]");
  assert.equal(value.safeTopLevel, "visible");
  assert.doesNotMatch(JSON.stringify(value), /super-secret-value-xyz|leaked-header-value|should-already/);
});
