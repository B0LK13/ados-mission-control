import { Suspense } from "react";
import { notFound } from "next/navigation";
import { dashboardViews, MissionControl, type DashboardView } from "@/components/mission-control";
import { getMissionSnapshot } from "@/lib/broker/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!dashboardViews.includes(view as DashboardView)) notFound();
  const snapshot = await getMissionSnapshot();
  return (
    <Suspense fallback={<div className="mission-shell">Loading Command Deck…</div>}>
      <MissionControl initialSnapshot={snapshot} view={view as DashboardView} />
    </Suspense>
  );
}
