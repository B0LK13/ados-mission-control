import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type HashVerifyStatus = "MATCH" | "MISMATCH" | "UNAVAILABLE";

export interface HashVerifyResult {
  status: HashVerifyStatus;
  expectedSha256: string | null;
  observedSha256: string | null;
  relativePath: string;
  detail: string;
  /** Never include file body. */
  contentIngested: false;
}

function normalizeRelative(input: string): string {
  return input.replace(/\\/g, "/").replace(/^\/+/, "");
}

/**
 * Recompute sha256 for a file under the control-plane root and compare to expected.
 * Rejects path traversal. Never returns file contents.
 */
export function verifyEvidenceHash(options: {
  controlPlaneRoot: string;
  relativePath: string;
  expectedSha256?: string | null;
}): HashVerifyResult {
  const relativePath = normalizeRelative(options.relativePath || "");
  if (!relativePath || relativePath.includes("\0")) {
    return {
      status: "UNAVAILABLE",
      expectedSha256: options.expectedSha256 || null,
      observedSha256: null,
      relativePath,
      detail: "relativePath missing or invalid",
      contentIngested: false,
    };
  }

  const root = path.resolve(options.controlPlaneRoot);
  const resolved = path.resolve(root, relativePath);
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    return {
      status: "UNAVAILABLE",
      expectedSha256: options.expectedSha256 || null,
      observedSha256: null,
      relativePath,
      detail: "Path traversal rejected",
      contentIngested: false,
    };
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return {
      status: "UNAVAILABLE",
      expectedSha256: options.expectedSha256 || null,
      observedSha256: null,
      relativePath,
      detail: "Evidence file UNAVAILABLE under control-plane root",
      contentIngested: false,
    };
  }

  const expected = (options.expectedSha256 || "").trim().toLowerCase();
  if (!expected || !/^[a-f0-9]{64}$/.test(expected)) {
    return {
      status: "UNAVAILABLE",
      expectedSha256: options.expectedSha256 || null,
      observedSha256: null,
      relativePath,
      detail: "expectedSha256 missing or not a 64-char hex digest",
      contentIngested: false,
    };
  }

  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(resolved));
  const observed = hash.digest("hex");
  const status: HashVerifyStatus = observed === expected ? "MATCH" : "MISMATCH";
  return {
    status,
    expectedSha256: expected,
    observedSha256: observed,
    relativePath,
    detail: status === "MATCH" ? "Digest matches metadata" : "Digest does not match metadata",
    contentIngested: false,
  };
}
