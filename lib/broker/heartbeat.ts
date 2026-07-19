import type { HeartbeatFreshness } from "@/lib/contracts";

/** FBL-MCLIVE-REL-001: derive heartbeat age from timestamp; never hardcode 0. */
export function computeHeartbeatAge(
  heartbeatAt: string | undefined | null,
  now: Date = new Date(),
  staleAfterSeconds = 120,
): { heartbeatAgeSeconds: number | null; heartbeatFreshness: HeartbeatFreshness } {
  if (heartbeatAt == null || String(heartbeatAt).trim() === "") {
    return { heartbeatAgeSeconds: null, heartbeatFreshness: "missing" };
  }
  const parsed = Date.parse(String(heartbeatAt));
  if (Number.isNaN(parsed)) {
    return { heartbeatAgeSeconds: null, heartbeatFreshness: "malformed" };
  }
  const ageMs = now.getTime() - parsed;
  if (!Number.isFinite(ageMs)) {
    return { heartbeatAgeSeconds: null, heartbeatFreshness: "error" };
  }
  const ageSec = Math.max(0, Math.floor(ageMs / 1000));
  if (ageSec <= staleAfterSeconds) {
    return { heartbeatAgeSeconds: ageSec, heartbeatFreshness: "fresh" };
  }
  return { heartbeatAgeSeconds: ageSec, heartbeatFreshness: "stale" };
}
