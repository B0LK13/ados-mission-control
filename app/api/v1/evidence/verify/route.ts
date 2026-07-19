import { getMissionControlConfig } from "@/lib/config";
import { verifyEvidenceHash } from "@/lib/evidence-hash";
import { missionJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Metadata-only hash verify — never returns evidence body contents. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const relativePath = url.searchParams.get("path") || url.searchParams.get("relativePath") || "";
  const expectedSha256 = url.searchParams.get("sha256") || url.searchParams.get("expectedSha256") || "";
  const config = getMissionControlConfig();
  const result = verifyEvidenceHash({
    controlPlaneRoot: config.orchestratorRoot,
    relativePath,
    expectedSha256,
  });
  return missionJson({
    ...result,
    authority: "OBSERVED",
    note: "Hash verification never ingests or returns evidence body content.",
  });
}
