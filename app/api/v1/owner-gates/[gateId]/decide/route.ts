import { decideOwnerGate } from "@/lib/commands/owner-gate-actions";
import type { OwnerDecisionPayload } from "@/lib/commands/owner-signing";
import { missionCommandJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ gateId: string }> },
) {
  const { gateId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    challenge?: OwnerDecisionPayload;
    signature?: string;
  };
  if (!body.challenge || !body.signature) {
    return missionCommandJson(
      { error: { code: "VALIDATION_ERROR", message: "challenge and signature are required." } },
      400,
    );
  }
  const result = await decideOwnerGate({
    gateId,
    challenge: body.challenge,
    signature: body.signature,
  });
  return missionCommandJson(result.body, result.httpStatus);
}
