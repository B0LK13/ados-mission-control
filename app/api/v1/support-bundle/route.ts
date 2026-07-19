import { buildSupportBundle } from "@/lib/support-bundle";
import { getSharedMissionSnapshot } from "@/lib/broker/snapshot-cache";
import { missionJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { snapshot } = await getSharedMissionSnapshot();
    const bundle = buildSupportBundle(snapshot);
    const stamp = bundle.generatedAt.replace(/[:.]/g, "-");
    return new Response(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mission-control-support-bundle-${stamp}.json"`,
        "Cache-Control": "no-store, max-age=0",
        "X-ADOS-Authority": "read-only",
      },
    });
  } catch {
    return missionJson(
      { error: { code: "READ_MODEL_UNAVAILABLE", message: "The read-only state model is unavailable." } },
      503,
    );
  }
}
