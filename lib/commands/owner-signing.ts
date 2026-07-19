import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const OWNER_CANONICALIZATION = "ADOS_SORTED_COMPACT_JSON_V1_EXCLUDING_SIGNATURE";

export interface OwnerDecisionPayload {
  schemaVersion: "1.0.0";
  gateId: string;
  status: "APPROVED" | "DENIED" | "CANCELLED";
  selectedOption: string | null;
  actor: "owner";
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  publicKeyId: string;
  signatureAlgorithm: "ed25519";
  canonicalization: typeof OWNER_CANONICALIZATION;
  signature?: string;
}

function sortedCompact(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => sortedCompact(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${sortedCompact(child)}`).join(",")}}`;
}

export function canonicalOwnerDecisionBytes(payload: OwnerDecisionPayload): Buffer {
  const clone: Record<string, unknown> = { ...payload };
  delete clone.signature;
  return Buffer.from(sortedCompact(clone), "utf8");
}

export function fingerprintPublicKeyDer(spkiDer: Buffer): string {
  return crypto.createHash("sha256").update(spkiDer).digest("hex").slice(0, 32);
}

export function loadPinnedOwnerPublicKey(pubkeyPath: string): { key: crypto.KeyObject; publicKeyId: string } {
  const resolved = path.resolve(pubkeyPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`OWNER_PUBKEY_MISSING:${resolved}`);
  }
  const pem = fs.readFileSync(resolved, "utf8");
  const key = crypto.createPublicKey(pem);
  const spki = key.export({ type: "spki", format: "der" });
  return { key, publicKeyId: fingerprintPublicKeyDer(spki) };
}

export function verifyOwnerDecisionSignature(
  payload: OwnerDecisionPayload,
  signatureBase64: string,
  publicKey: crypto.KeyObject,
): boolean {
  try {
    const signature = Buffer.from(signatureBase64, "base64");
    return crypto.verify(null, canonicalOwnerDecisionBytes(payload), publicKey, signature);
  } catch {
    return false;
  }
}

export function signOwnerDecision(
  payload: OwnerDecisionPayload,
  privateKeyPem: string,
): string {
  const key = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, canonicalOwnerDecisionBytes(payload), key);
  return signature.toString("base64");
}

export function buildOwnerDecisionChallenge(input: {
  gateId: string;
  status: "APPROVED" | "DENIED" | "CANCELLED";
  selectedOption?: string | null;
  publicKeyId: string;
  validMinutes?: number;
}): OwnerDecisionPayload {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + (input.validMinutes ?? 15) * 60_000);
  return {
    schemaVersion: "1.0.0",
    gateId: input.gateId,
    status: input.status,
    selectedOption: input.selectedOption ?? null,
    actor: "owner",
    nonce: crypto.randomBytes(24).toString("hex"),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    publicKeyId: input.publicKeyId,
    signatureAlgorithm: "ed25519",
    canonicalization: OWNER_CANONICALIZATION,
  };
}
