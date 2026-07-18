import type { MissionSnapshot, ReadModelStatus } from "@/lib/contracts";

export interface IngestWatermark {
  source: string;
  cursor: string;
  recordCount: number;
  warningCount: number;
  observedAt: string;
}

export interface CachedSnapshot {
  snapshot: MissionSnapshot;
  persistedAt: string;
}

export interface ReadModelStore {
  saveSnapshot(snapshot: MissionSnapshot, watermarks: IngestWatermark[]): ReadModelStatus;
  loadLatest(): CachedSnapshot | null;
  getStatus(): ReadModelStatus;
  close(): void;
}

export const disabledReadModelStatus: ReadModelStatus = {
  backend: "DISABLED",
  status: "DISABLED",
  schemaVersion: null,
  lastPersistedAt: null,
  watermarkCount: 0,
  recoveredFromCache: false,
};
