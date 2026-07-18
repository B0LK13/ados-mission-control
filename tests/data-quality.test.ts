import assert from "node:assert/strict";
import test from "node:test";
import { coerceFreshness, deriveFreshness, freshnessFromSnapshot } from "../lib/data-quality";
import type { MissionSnapshot } from "../lib/contracts";

test("fixture and mock paths never become AUTHORITATIVE freshness", () => {
  assert.equal(
    deriveFreshness({
      sourceMode: "FIXTURE",
      reachable: true,
      stale: false,
      recoveredFromCache: false,
    }),
    "MOCK",
  );
  assert.equal(coerceFreshness("AUTHORITATIVE", "FIXTURE"), "MOCK");
});

test("stale cache recovery is labeled STALE", () => {
  assert.equal(
    deriveFreshness({
      sourceMode: "UNAVAILABLE",
      reachable: false,
      stale: true,
      recoveredFromCache: true,
    }),
    "STALE",
  );
});

test("live reachable source is LIVE until the stream disconnects", () => {
  assert.equal(
    deriveFreshness({
      sourceMode: "LIVE",
      reachable: true,
      stale: false,
      recoveredFromCache: false,
      streamConnected: true,
    }),
    "LIVE",
  );
  assert.equal(
    deriveFreshness({
      sourceMode: "LIVE",
      reachable: true,
      stale: false,
      recoveredFromCache: false,
      streamConnected: false,
    }),
    "CACHED",
  );
});

test("freshnessFromSnapshot mirrors snapshot source and cache flags", () => {
  const snapshot = {
    source: {
      mode: "LIVE",
      reachable: true,
      stale: false,
    },
    readModel: {
      recoveredFromCache: false,
    },
  } as Pick<MissionSnapshot, "source" | "readModel">;
  assert.equal(freshnessFromSnapshot(snapshot, true), "LIVE");
});
