import type { MissionSnapshot } from "@/lib/contracts";
import { getMissionControlConfig } from "@/lib/config";
import { getMissionSnapshot } from "@/lib/broker/snapshot";

type CacheEntry = {
  fetchedAt: number;
  sequence: number;
  promise: Promise<MissionSnapshot>;
};

let entry: CacheEntry | null = null;
let sequence = 0;

/** Test helper — clears the in-process shared snapshot fan-out cache. */
export function resetSharedSnapshotCache(): void {
  entry = null;
  sequence = 0;
}

/**
 * FBL-PERF-002: share one in-flight/recent snapshot across REST and SSE clients
 * for the configured refresh window instead of rebuilding per subscriber.
 */
export async function getSharedMissionSnapshot(maxAgeMs?: number): Promise<{
  snapshot: MissionSnapshot;
  sequence: number;
  shared: boolean;
}> {
  const ttl =
    maxAgeMs != null
      ? Math.max(1, maxAgeMs)
      : Math.max(250, getMissionControlConfig().refreshMs);
  const now = Date.now();
  if (entry && now - entry.fetchedAt < ttl) {
    return {
      snapshot: await entry.promise,
      sequence: entry.sequence,
      shared: true,
    };
  }

  sequence += 1;
  const next: CacheEntry = {
    fetchedAt: now,
    sequence,
    promise: getMissionSnapshot(),
  };
  entry = next;

  try {
    const snapshot = await next.promise;
    return { snapshot, sequence: next.sequence, shared: false };
  } catch (error) {
    if (entry === next) entry = null;
    throw error;
  }
}
