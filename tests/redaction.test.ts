import assert from "node:assert/strict";
import test from "node:test";
import { redactText, safeSummary } from "../lib/redaction";

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
