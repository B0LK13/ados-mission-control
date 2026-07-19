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

export async function missionResponse<T>(
  selector: (snapshot: MissionSnapshot) => T,
): Promise<Response> {
  try {
    const { snapshot } = await getSharedMissionSnapshot();
    return missionJson(selector(snapshot));
  } catch {
    return missionJson(
      { error: { code: "READ_MODEL_UNAVAILABLE", message: "The read-only state model is unavailable." } },
      503,
    );
  }
}
