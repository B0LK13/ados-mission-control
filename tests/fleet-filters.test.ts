import assert from "node:assert/strict";
import { test } from "node:test";
import { filterFleetMembers, formatProbeAge, groupFleetByRole } from "../lib/fleet-filters";
import type { FleetMemberStatus } from "../lib/fleet";

function member(overrides: Partial<FleetMemberStatus> & Pick<FleetMemberStatus, "id" | "label">): FleetMemberStatus {
  return {
    role: "member",
    reachable: true,
    readiness: "OK",
    primaryAgent: "CLAUDE",
    freshness: "OBSERVED",
    detail: "ok",
    authority: "NON_AUTHORITATIVE",
    probedAt: "2026-07-19T12:00:00.000Z",
    ...overrides,
  };
}

test("filterFleetMembers filters by reachability and role/label", () => {
  const members = [
    member({ id: "a", label: "Alpha", role: "primary", reachable: true }),
    member({ id: "b", label: "Beta", role: "worker", reachable: false }),
  ];
  assert.equal(filterFleetMembers(members, { reachability: "REACHABLE" }).length, 1);
  assert.equal(filterFleetMembers(members, { reachability: "UNREACHABLE" })[0]?.id, "b");
  assert.equal(filterFleetMembers(members, { roleQuery: "worker" })[0]?.id, "b");
  assert.equal(filterFleetMembers(members, { roleQuery: "alpha" })[0]?.id, "a");
  assert.ok(members.every((item) => item.authority === "NON_AUTHORITATIVE"));
});

test("groupFleetByRole groups without inventing members", () => {
  const groups = groupFleetByRole([
    member({ id: "a", label: "A", role: "primary" }),
    member({ id: "b", label: "B", role: "primary" }),
    member({ id: "c", label: "C", role: "worker" }),
  ]);
  assert.equal(groups.primary.length, 2);
  assert.equal(groups.worker.length, 1);
});

test("formatProbeAge never invents age for missing timestamps", () => {
  assert.equal(formatProbeAge(null), "UNAVAILABLE");
  assert.equal(formatProbeAge("not-a-date"), "UNAVAILABLE");
  const now = Date.parse("2026-07-19T12:00:30.000Z");
  assert.equal(formatProbeAge("2026-07-19T12:00:00.000Z", now), "30s ago");
});
