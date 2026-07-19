import type { MissionSnapshot } from "@/lib/contracts";
import { getSharedMissionSnapshot } from "@/lib/broker/snapshot-cache";
import { redactValue } from "@/lib/redaction";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  "X-ADOS-Authority": "read-only",
};

export function missionJson(data: unknown, status = 200): Response {
  return Response.json(redactValue(data), { status, headers });
}

/** Redacted JSON for Phase-2/3 command routes (not the read-model selector helper). */
export function missionCommandJson(
  data: unknown,
  status = 200,
  authority: "phase2-commands" | "phase3-commands" | "phase6-commands" = "phase2-commands",
): Response {
  return Response.json(redactValue(data), {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-ADOS-Authority": status >= 200 && status < 300 ? authority : "read-only",
    },
  });
}

export async function missionResponse<T>(
  selector: (snapshot: MissionSnapshot) => T | Response,
): Promise<Response> {
  try {
    const { snapshot } = await getSharedMissionSnapshot();
    const selected = selector(snapshot);
    if (selected instanceof Response) return selected;
    return missionJson(selected);
  } catch {
    return missionJson(
      { error: { code: "READ_MODEL_UNAVAILABLE", message: "The read-only state model is unavailable." } },
      503,
    );
  }
}
