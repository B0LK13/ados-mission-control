import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { MissionSnapshot, ReadModelStatus } from "@/lib/contracts";
import { redactValue } from "@/lib/redaction";
import type { CachedSnapshot, IngestWatermark, ReadModelStore } from "./store";
import { disabledReadModelStatus } from "./store";

const DATABASE_SCHEMA_VERSION = 1;

export class SqliteReadModelStore implements ReadModelStore {
  private readonly database: DatabaseSync;

  constructor(dataRoot: string) {
    const resolvedRoot = path.resolve(dataRoot);
    mkdirSync(resolvedRoot, { recursive: true });
    this.database = new DatabaseSync(path.join(resolvedRoot, "mission-control-v2.sqlite"));
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_meta (
        version INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS snapshot_cache (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        payload_json TEXT NOT NULL,
        persisted_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ingest_watermark (
        source TEXT PRIMARY KEY,
        cursor_value TEXT NOT NULL,
        record_count INTEGER NOT NULL,
        warning_count INTEGER NOT NULL,
        observed_at TEXT NOT NULL
      );
    `);
    const schemaRow = this.database.prepare("SELECT version FROM schema_meta LIMIT 1").get() as { version?: number } | undefined;
    if (!schemaRow) this.database.prepare("INSERT INTO schema_meta(version) VALUES (?)").run(DATABASE_SCHEMA_VERSION);
    else if (schemaRow.version !== DATABASE_SCHEMA_VERSION) throw new Error("READ_MODEL_SCHEMA_VERSION_UNSUPPORTED");
  }

  saveSnapshot(snapshot: MissionSnapshot, watermarks: IngestWatermark[]): ReadModelStatus {
    const persistedAt = new Date().toISOString();
    const safePayload = JSON.stringify(redactValue(snapshot));
    const saveSnapshot = this.database.prepare(`
      INSERT INTO snapshot_cache(singleton, payload_json, persisted_at) VALUES (1, ?, ?)
      ON CONFLICT(singleton) DO UPDATE SET payload_json=excluded.payload_json, persisted_at=excluded.persisted_at
    `);
    const saveWatermark = this.database.prepare(`
      INSERT INTO ingest_watermark(source, cursor_value, record_count, warning_count, observed_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(source) DO UPDATE SET
        cursor_value=excluded.cursor_value,
        record_count=excluded.record_count,
        warning_count=excluded.warning_count,
        observed_at=excluded.observed_at
    `);

    this.database.exec("BEGIN IMMEDIATE");
    try {
      saveSnapshot.run(safePayload, persistedAt);
      for (const watermark of watermarks) {
        saveWatermark.run(watermark.source, watermark.cursor, watermark.recordCount, watermark.warningCount, watermark.observedAt);
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    return { ...this.getStatus(), lastPersistedAt: persistedAt };
  }

  loadLatest(): CachedSnapshot | null {
    const row = this.database.prepare("SELECT payload_json, persisted_at FROM snapshot_cache WHERE singleton=1").get() as { payload_json?: string; persisted_at?: string } | undefined;
    if (!row?.payload_json || !row.persisted_at) return null;
    try {
      const snapshot = JSON.parse(row.payload_json) as MissionSnapshot;
      if (!snapshot || typeof snapshot !== "object" || !snapshot.systemHealth || !snapshot.source) return null;
      return { snapshot, persistedAt: row.persisted_at };
    } catch {
      return null;
    }
  }

  getStatus(): ReadModelStatus {
    const snapshot = this.database.prepare("SELECT persisted_at FROM snapshot_cache WHERE singleton=1").get() as { persisted_at?: string } | undefined;
    const watermark = this.database.prepare("SELECT COUNT(*) AS count FROM ingest_watermark").get() as { count?: number | bigint } | undefined;
    return {
      backend: "SQLITE",
      status: "READY",
      schemaVersion: DATABASE_SCHEMA_VERSION,
      lastPersistedAt: snapshot?.persisted_at || null,
      watermarkCount: Number(watermark?.count || 0),
      recoveredFromCache: false,
    };
  }

  close(): void {
    this.database.close();
  }
}

class DisabledReadModelStore implements ReadModelStore {
  saveSnapshot(): ReadModelStatus { return disabledReadModelStatus; }
  loadLatest(): CachedSnapshot | null { return null; }
  getStatus(): ReadModelStatus { return disabledReadModelStatus; }
  close(): void {}
}

let singleton: ReadModelStore | null = null;
let singletonKey = "";

export function getReadModelStore(config: { persistenceMode: "sqlite" | "disabled"; dataRoot: string }): ReadModelStore {
  const key = `${config.persistenceMode}:${path.resolve(config.dataRoot)}`;
  if (singleton && singletonKey === key) return singleton;
  singleton?.close();
  singletonKey = key;
  singleton = config.persistenceMode === "sqlite" ? new SqliteReadModelStore(config.dataRoot) : new DisabledReadModelStore();
  return singleton;
}

export function closeReadModelStore(): void {
  singleton?.close();
  singleton = null;
  singletonKey = "";
}
