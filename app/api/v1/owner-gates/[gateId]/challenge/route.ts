import { createOwnerGateChallenge } from "@/lib/commands/owner-gate-actions";
import { missionCommandJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ gateId: string }> },
) {
  const { gateId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    status?: "APPROVED" | "DENIED" | "CANCELLED";
    selectedOption?: string;
  };
  const status = body.status || "APPROVED";
  const result = createOwnerGateChallenge({
    gateId,
    status,
    selectedOption: body.selectedOption,
  });
  return missionCommandJson(result.body, result.httpStatus);
}
