import { invokeAdosTool, isPhase2CommandsEnabled } from "@/lib/commands/ados-bridge";
import {
  buildOwnerDecisionChallenge,
  loadPinnedOwnerPublicKey,
  type OwnerDecisionPayload,
  verifyOwnerDecisionSignature,
} from "@/lib/commands/owner-signing";

function requirePubkeyPath(): string {
  const configured = process.env.MISSION_CONTROL_OWNER_PUBKEY_PATH?.trim();
  if (!configured) {
    throw new Error("OWNER_PUBKEY_NOT_CONFIGURED");
  }
  return configured;
}

export function createOwnerGateChallenge(input: {
  gateId: string;
  status: "APPROVED" | "DENIED" | "CANCELLED";
  selectedOption?: string | null;
}) {
  if (!isPhase2CommandsEnabled()) {
    return {
      httpStatus: 405 as const,
      body: { error: { code: "PHASE2_DISABLED", message: "Phase 2 commands are disabled." } },
    };
  }
  try {
    const { publicKeyId } = loadPinnedOwnerPublicKey(requirePubkeyPath());
    const challenge = buildOwnerDecisionChallenge({
      gateId: input.gateId,
      status: input.status,
      selectedOption: input.selectedOption,
      publicKeyId,
    });
    return {
      httpStatus: 200 as const,
      body: {
        ok: true,
        challenge,
        signingInstructions:
          "Sign canonical ADOS_SORTED_COMPACT_JSON_V1_EXCLUDING_SIGNATURE bytes with the owner Ed25519 private key. Private keys must not enter Mission Control.",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "pubkey load failed";
    return {
      httpStatus: 503 as const,
      body: {
        error: {
          code: "OWNER_PUBKEY_REQUIRED",
          message: `Fail-closed: pinned owner public key is required for gate decisions (${message}).`,
        },
      },
    };
  }
}

export async function decideOwnerGate(input: {
  gateId: string;
  challenge: OwnerDecisionPayload;
  signature: string;
}) {
  if (!isPhase2CommandsEnabled()) {
    return {
      httpStatus: 405 as const,
      body: { error: { code: "PHASE2_DISABLED", message: "Phase 2 commands are disabled." } },
    };
  }
  if (input.challenge.gateId !== input.gateId) {
    return {
      httpStatus: 400 as const,
      body: { error: { code: "GATE_ID_MISMATCH", message: "challenge.gateId must match path gateId." } },
    };
  }
  if (input.challenge.actor !== "owner") {
    return {
      httpStatus: 403 as const,
      body: { error: { code: "NON_OWNER_ACTOR", message: "challenge.actor must be owner." } },
    };
  }
  if (new Date(input.challenge.expiresAt).getTime() < Date.now()) {
    return {
      httpStatus: 403 as const,
      body: { error: { code: "CHALLENGE_EXPIRED", message: "Signing challenge expired." } },
    };
  }

  let publicKey;
  let publicKeyId: string;
  try {
    ({ key: publicKey, publicKeyId } = loadPinnedOwnerPublicKey(requirePubkeyPath()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "pubkey load failed";
    return {
      httpStatus: 503 as const,
      body: { error: { code: "OWNER_PUBKEY_REQUIRED", message } },
    };
  }

  if (input.challenge.publicKeyId !== publicKeyId) {
    return {
      httpStatus: 403 as const,
      body: { error: { code: "PUBLIC_KEY_MISMATCH", message: "challenge.publicKeyId does not match pinned key." } },
    };
  }

  const valid = verifyOwnerDecisionSignature(input.challenge, input.signature, publicKey);
  if (!valid) {
    return {
      httpStatus: 403 as const,
      body: { error: { code: "INVALID_SIGNATURE", message: "Owner signature verification failed." } },
    };
  }

  const result = await invokeAdosTool("set-owner-gate-decision", {
    "gate-id": input.gateId,
    status: input.challenge.status,
    actor: "owner",
    "selected-option": input.challenge.selectedOption || "",
    signature: input.signature,
    nonce: input.challenge.nonce,
    "public-key-id": publicKeyId,
  });

  if (!result.ok) {
    const code = result.code || "TOOL_FAILED";
    const status =
      code === "GATE_NOT_FOUND" || code === "GATE_NOT_OPEN"
        ? 404
        : code === "AGENT_SELF_APPROVE_DENIED" || code === "NON_OWNER_ACTOR" || code === "SIGNATURE_REQUIRED"
          ? 403
          : 502;
    return {
      httpStatus: status as 403 | 404 | 502,
      body: { error: { code, message: result.message || "Owner-gate tool failed.", details: result.data } },
    };
  }

  return {
    httpStatus: 200 as const,
    body: {
      ok: true,
      gateId: input.gateId,
      status: input.challenge.status,
      tool: result.data,
      authority: "phase2-ados-tool-signed",
    },
  };
}
