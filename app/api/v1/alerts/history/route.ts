import { isAlertsEnabled } from "@/lib/alerts/enabled";
import { listAlertHistory } from "@/lib/alerts/history-store";
import { missionJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isAlertsEnabled()) {
    return missionJson({
      enabled: false,
      items: [],
      note: "MISSION_CONTROL_ALERTS is disabled (default).",
    });
  }
  return missionJson({
    enabled: true,
    items: listAlertHistory(100),
    note: "Local Mission Control alert history. Non-authoritative; never grants mutation power.",
  });
}
