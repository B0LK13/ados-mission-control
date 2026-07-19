import { runCampaignControl } from "@/lib/commands/phase3-actions";
import { missionCommandJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    approvalId?: string;
    campaignId?: string;
    control?: "PAUSE" | "RESUME";
  };
  if (!body.approvalId || !body.campaignId || !body.control) {
    return missionCommandJson(
      { error: { code: "VALIDATION_ERROR", message: "approvalId, campaignId, and control are required." } },
      400,
      "phase3-commands",
    );
  }
  if (!["PAUSE", "RESUME"].includes(body.control)) {
    return missionCommandJson(
      { error: { code: "VALIDATION_ERROR", message: "control must be PAUSE or RESUME." } },
      400,
      "phase3-commands",
    );
  }
  const result = await runCampaignControl({
    approvalId: body.approvalId,
    campaignId: body.campaignId,
    control: body.control,
  });
  return missionCommandJson(result.body, result.httpStatus, "phase3-commands");
}
