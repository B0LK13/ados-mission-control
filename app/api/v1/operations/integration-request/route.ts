import { runIntegrationRequest } from "@/lib/commands/phase6-actions";
import { missionCommandJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return missionCommandJson(
      { error: { code: "VALIDATION_ERROR", message: "JSON body required." } },
      400,
      "phase6-commands",
    );
  }
  const result = await runIntegrationRequest({
    approvalId: String(body.approvalId || ""),
    projectId: String(body.projectId || ""),
    summary: body.summary ? String(body.summary) : undefined,
  });
  return missionCommandJson(result.body, result.httpStatus, "phase6-commands");
}
