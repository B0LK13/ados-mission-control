import type {
  Authority,
  FreshnessLabel,
  MissionSnapshot,
  SourceMode,
  VerificationLabel,
} from "@/lib/contracts";

export type { FreshnessLabel };

export interface FreshnessInput {
  sourceMode: SourceMode;
  reachable: boolean;
  stale: boolean;
  recoveredFromCache: boolean;
  streamConnected?: boolean;
}

/**
 * Derive operator-facing freshness. MOCK/FIXTURE paths never become AUTHORITATIVE.
 * Record-level authority remains on each card via `authority` / `verification`.
 */
export function deriveFreshness(input: FreshnessInput): FreshnessLabel {
  if (input.sourceMode === "FIXTURE") return "MOCK";
  if (input.recoveredFromCache || input.stale) return "STALE";
  if (input.sourceMode === "UNAVAILABLE" || !input.reachable) return "UNAVAILABLE";
  if (input.streamConnected === false) return "CACHED";
  if (input.sourceMode === "LIVE" && input.reachable) return "LIVE";
  return "UNAVAILABLE";
}

/** MOCK data may never be presented as AUTHORITATIVE freshness. */
export function coerceFreshness(label: FreshnessLabel, sourceMode: SourceMode): FreshnessLabel {
  if (sourceMode === "FIXTURE") return "MOCK";
  if (label === "AUTHORITATIVE" && sourceMode !== "LIVE") return "INFERRED";
  return label;
}

export function freshnessFromSnapshot(
  snapshot: Pick<MissionSnapshot, "source" | "readModel">,
  streamConnected?: boolean,
): FreshnessLabel {
  return coerceFreshness(
    deriveFreshness({
      sourceMode: snapshot.source.mode,
      reachable: snapshot.source.reachable,
      stale: snapshot.source.stale,
      recoveredFromCache: snapshot.readModel.recoveredFromCache,
      streamConnected,
    }),
    snapshot.source.mode,
  );
}

export function isAuthoritativeDisplay(authority: Authority, freshness: FreshnessLabel): boolean {
  return (
    authority === "AUTHORITATIVE" &&
    freshness !== "MOCK" &&
    freshness !== "STALE" &&
    freshness !== "UNAVAILABLE"
  );
}

export function verificationTone(label: VerificationLabel): "trust" | "caution" | "reject" {
  if (label === "AUTHORITATIVE" || label === "VERIFIED_DIRECTLY") return "trust";
  if (label === "CONTRADICTED" || label === "DIAGNOSTIC_ONLY") return "reject";
  return "caution";
}
