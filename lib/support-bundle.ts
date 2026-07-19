import fs from "node:fs";
import path from "node:path";
import type { MissionSnapshot } from "@/lib/contracts";
import { getMissionControlConfig } from "@/lib/config";
import { getMetricsSnapshot } from "@/lib/metrics";
import { redactHighRiskEnvelope } from "@/lib/redaction";

export interface SupportBundle {
  schemaVersion: "1.0.0";
  generatedAt: string;
  authority: "READ_ONLY";
  purpose: "diagnostics";
  application: {
    name: string;
    cockpitId: string;
    version: string;
    buildId: string;
    nodeVersion: string;
    platform: string;
  };
  configuration: {
    mode: string;
    authMode: string;
    persistenceMode: string;
    refreshMs: number;
    roots: Array<{
      role: string;
      path: string;
      exists: boolean;
    }>;
  };
  health: {
    readiness: string;
    primaryAgent: string;
    source: MissionSnapshot["source"];
    readModel: MissionSnapshot["readModel"];
    freshness: MissionSnapshot["freshness"];
    parsingWarningCount: number;
    alertCodes: string[];
    campaignCount: number;
    ownerGateCount: number;
    pendingApprovalCount: number;
    metrics: Record<string, number>;
  };
  warnings: string[];
}

function rootEntry(role: string, rootPath: string) {
  let exists = false;
  try {
    exists = fs.existsSync(rootPath);
  } catch {
    exists = false;
  }
  return {
    role,
    path: path.resolve(rootPath),
    exists,
  };
}

/**
 * FBL-OPS-003: build a redacted, GET-only diagnostic bundle.
 * Never includes auth secrets, approval bodies, or raw secret-bearing files.
 */
export function buildSupportBundle(snapshot: MissionSnapshot, generatedAt = new Date().toISOString()): SupportBundle {
  const config = getMissionControlConfig();
  const warnings = [
    ...snapshot.source.warnings.slice(0, 20),
    "Support bundle is observational only. It does not grant mutation or owner approval rights.",
  ];

  const bundle: SupportBundle = {
    schemaVersion: "1.0.0",
    generatedAt,
    authority: "READ_ONLY",
    purpose: "diagnostics",
    application: {
      name: "ados-mission-control",
      cockpitId: config.cockpitId,
      version: config.applicationVersion,
      buildId: config.buildId,
      nodeVersion: process.version,
      platform: process.platform,
    },
    configuration: {
      mode: config.mode,
      authMode: config.authMode,
      persistenceMode: config.persistenceMode,
      refreshMs: config.refreshMs,
      roots: [
        rootEntry("orchestratorRoot", config.orchestratorRoot),
        rootEntry("sourceRoot", config.sourceRoot),
        rootEntry("cursorWorktree", config.cursorWorktree),
        rootEntry("productRoot", config.productRoot),
        rootEntry("dataRoot", config.dataRoot),
      ],
    },
    health: {
      readiness: snapshot.systemHealth.readiness,
      primaryAgent: snapshot.systemHealth.primaryAgent,
      source: snapshot.source,
      readModel: snapshot.readModel,
      freshness: snapshot.freshness,
      parsingWarningCount: snapshot.source.parsingWarningCount,
      alertCodes: snapshot.alerts.map((alert) => alert.code).slice(0, 50),
      campaignCount: snapshot.campaigns.length,
      ownerGateCount: snapshot.ownerGates.length,
      pendingApprovalCount: snapshot.approvals.filter((item) => item.status === "PENDING").length,
      metrics: getMetricsSnapshot(),
    },
    warnings,
  };

  return redactHighRiskEnvelope(bundle) as SupportBundle;
}
