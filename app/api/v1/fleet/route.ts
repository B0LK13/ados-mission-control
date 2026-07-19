import { buildFleetProjection } from "@/lib/fleet";
import { missionJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const projection = await buildFleetProjection();
  return missionJson({
    ...projection,
    authority: "NON_AUTHORITATIVE",
    note: "Fleet rows never inherit this cockpit's PRIMARY lease authority.",
  });
}
