import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { missionResponse } from "../lib/http";
import { redactText, redactValue } from "../lib/redaction";

test("redacts secret-like objects, connection strings, and query parameters", () => {
  const value = redactValue({
    authorization: "Bearer abcdefghijklmnop",
    nested: { api_key: "secret-value", url: "https://service.test/cb?token=top-secret" },
    connection: "Server=db;Database=ados;Password=hunter2;",
  }) as Record<string, unknown>;
  assert.equal(value.authorization, "[REDACTED]");
  assert.match(JSON.stringify(value), /\[REDACTED\]/);
  assert.doesNotMatch(JSON.stringify(value), /hunter2|top-secret|secret-value/);
  assert.doesNotMatch(redactText("Cookie: session=very-secret"), /very-secret/);
});

test("all API mutations are rejected before route handling", async () => {
  process.env.MISSION_CONTROL_AUTH_MODE = "disabled";
  process.env.MISSION_CONTROL_PHASE2_COMMANDS = "disabled";
  for (const route of [
    "http://localhost/api/approvals/approval-1",
    "http://localhost/api/v1/campaigns",
    "http://localhost/api/v1/owner-gates",
    "http://localhost/api/v1/approvals/approval-1/approve",
    "http://localhost/api/v1/owner-gates/gate-1/decide",
    "http://localhost/api/v1/replay?campaignId=c&runId=r",
    "http://localhost/api/v1/evidence-diff?campaignId=c&leftRunId=a&rightRunId=b",
    "http://localhost/api/v1/dead-letter",
    "http://localhost/api/v1/support-bundle",
    "http://localhost/api/v1/approvals/approval-1/approve",
    "http://localhost/api/v1/owner-gates/gate-1/decide",
    "http://localhost/api/v1/operations/dispatch",
    "http://localhost/api/v1/operations/campaign-control",
  ]) {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = middleware(new NextRequest(route, { method }));
      assert.equal(response.status, 405);
      assert.equal(response.headers.get("allow"), "GET, HEAD, OPTIONS");
      assert.equal((await response.json()).error.code, "READ_ONLY_V2");
    }
  }
});

test("safe methods pass through the read-only middleware", () => {
  process.env.MISSION_CONTROL_AUTH_MODE = "disabled";
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    const response = middleware(new NextRequest("http://localhost/api/health", { method }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  }
});

test("basic authentication fails closed, protects UI and APIs, and exempts health checks", async () => {
  const previous = {
    mode: process.env.MISSION_CONTROL_AUTH_MODE,
    user: process.env.MISSION_CONTROL_AUTH_USER,
    secret: process.env.MISSION_CONTROL_AUTH_SECRET,
  };
  try {
    process.env.MISSION_CONTROL_AUTH_MODE = "basic";
    process.env.MISSION_CONTROL_AUTH_USER = "owner";
    delete process.env.MISSION_CONTROL_AUTH_SECRET;
    let response = middleware(new NextRequest("http://localhost/overview"));
    assert.equal(response.status, 503);

    process.env.MISSION_CONTROL_AUTH_SECRET = "test-only-password";
    response = middleware(new NextRequest("http://localhost/api/v1/snapshot"));
    assert.equal(response.status, 401);
    assert.match(response.headers.get("www-authenticate") || "", /Basic realm=/);

    response = middleware(new NextRequest("http://localhost/overview", {
      headers: { authorization: `Basic ${Buffer.from("owner:wrong-password").toString("base64")}` },
    }));
    assert.equal(response.status, 401);

    response = middleware(new NextRequest("http://localhost/overview", {
      headers: { authorization: `Basic ${Buffer.from("owner:test-only-password").toString("base64")}` },
    }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");

    response = middleware(new NextRequest("http://localhost/api/health"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");

    response = middleware(new NextRequest("http://localhost/api/v1/metrics"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  } finally {
    if (previous.mode === undefined) delete process.env.MISSION_CONTROL_AUTH_MODE;
    else process.env.MISSION_CONTROL_AUTH_MODE = previous.mode;
    if (previous.user === undefined) delete process.env.MISSION_CONTROL_AUTH_USER;
    else process.env.MISSION_CONTROL_AUTH_USER = previous.user;
    if (previous.secret === undefined) delete process.env.MISSION_CONTROL_AUTH_SECRET;
    else process.env.MISSION_CONTROL_AUTH_SECRET = previous.secret;
  }
});

test("unexpected selector failures return a generic redacted error", async () => {
  process.env.MISSION_CONTROL_MODE = "fixture";
  const response = await missionResponse(() => { throw new Error("Bearer abcdefghijklmnop"); });
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.match(body, /READ_MODEL_UNAVAILABLE/);
  assert.doesNotMatch(body, /abcdefgh/);
});
