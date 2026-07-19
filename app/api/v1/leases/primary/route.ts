import { missionResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Authoritative primary lease from the brokered snapshot (ADOS lease file + observed liveness). */
export async function GET() {
  return missionResponse((snapshot) => ({
    lease: snapshot.primaryLease,
    snapshotAt: snapshot.snapshotAt,
    freshness: snapshot.freshness,
    authority: snapshot.primaryLease.authority,
  }));
}
