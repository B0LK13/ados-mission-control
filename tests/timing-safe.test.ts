import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { timingSafeEqualString } from "../lib/security/timing-safe";

describe("timingSafeEqualString (FBL-SEC-004)", () => {
  it("returns true for equal strings", () => {
    assert.equal(timingSafeEqualString("owner", "owner"), true);
    assert.equal(timingSafeEqualString("", ""), true);
  });

  it("returns false for unequal values and lengths", () => {
    assert.equal(timingSafeEqualString("owner", "Owner"), false);
    assert.equal(timingSafeEqualString("short", "longer-secret"), false);
    assert.equal(timingSafeEqualString("test-only-password", "test-only-passwor"), false);
  });
});
