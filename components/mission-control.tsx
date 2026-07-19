"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Bot,
  Boxes,
  ChevronRight,
  CircleDot,
  FileCheck2,
  FileDiff,
  FileSearch,
  Fingerprint,
  Flag,
  FolderGit2,
  Gauge,
  GitBranch,
  Hexagon,
  History,
  ListFilter,
  Moon,
  Network,
  OctagonAlert,
  Play,
  Radio,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sun,
  TerminalSquare,
  Waypoints,
  Workflow as WorkflowIcon,
} from "lucide-react";
import type {
  AgentCard,
  ApprovalCard,
  AuditEntry,
  CampaignCard,
  EvidenceItem,
  FreshnessLabel,
  HandoffItem,
  MissionSnapshot,
  OwnerGateCard,
  VerificationLabel,
  WorktreeNode,
} from "@/lib/contracts";
import { summarizeApproval } from "@/lib/approval-summary";
import { buildCampaignBudgetPanel } from "@/lib/campaign-budgets";
import { buildDeadLetterProjection, type DeadLetterItem } from "@/lib/dead-letter";
import { freshnessFromSnapshot } from "@/lib/data-quality";
import type { EvidenceDiffProjection } from "@/lib/evidence-diff";
import type { ReplayEvent, ReplayProjection } from "@/lib/replay";
import { scoreApprovalRisk, scoreCampaignRisk, scoreTaskRisk } from "@/lib/risk-scoring";
import { buildTaskDependencyGraph } from "@/lib/task-dependency-graph";

export const dashboardViews = [
  "overview",
  "projects",
  "agents",
  "tasks",
  "approvals",
  "campaigns",
  "owner-gates",
  "workflow",
  "handoffs",
  "worktrees",
  "evidence",
  "safety",
  "timeline",
  "routing-incidents",
  "dead-letter",
  "operations",
  "fleet",
  "replay",
  "evidence-diff",
] as const;
export type DashboardView = (typeof dashboardViews)[number];

const navigation: Array<{ view: DashboardView; label: string; icon: typeof Gauge }> = [
  { view: "overview", label: "Overview", icon: Gauge },
  { view: "projects", label: "Projects", icon: Boxes },
  { view: "agents", label: "Agents & runtimes", icon: Bot },
  { view: "tasks", label: "Tasks & executions", icon: TerminalSquare },
  { view: "approvals", label: "Approvals", icon: FileCheck2 },
  { view: "campaigns", label: "Campaigns", icon: Flag },
  { view: "owner-gates", label: "Owner gates", icon: ShieldAlert },
  { view: "workflow", label: "Workflow", icon: WorkflowIcon },
  { view: "handoffs", label: "Handoffs", icon: GitBranch },
  { view: "worktrees", label: "Worktrees", icon: FolderGit2 },
  { view: "evidence", label: "Evidence", icon: FileSearch },
  { view: "safety", label: "Safety", icon: Siren },
  { view: "timeline", label: "Evidence & audit", icon: Activity },
  { view: "routing-incidents", label: "Routing incidents", icon: Waypoints },
  { view: "dead-letter", label: "Dead letter", icon: OctagonAlert },
  { view: "operations", label: "Operations", icon: Play },
  { view: "fleet", label: "Fleet", icon: Network },
  { view: "replay", label: "Replay", icon: History },
  { view: "evidence-diff", label: "Evidence diff", icon: FileDiff },
];

const viewCopy: Record<DashboardView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Command surface / 01", title: "Operational overview", description: "The authoritative state of projects, agents, owner gates, blockers, and recent execution evidence." },
  projects: { eyebrow: "Repository registry / 02", title: "Projects", description: "Canonical repositories, control-plane boundaries, integration worktrees, and next permitted actions." },
  agents: { eyebrow: "Runtime registry / 03", title: "Agents & runtimes", description: "Availability, verification, authority, last execution, and promotion state without runtime mutation controls." },
  tasks: { eyebrow: "Execution ledger / 04", title: "Tasks & executions", description: "Task contracts reconciled with results, protocol state, approvals, evidence, and bounded next actions." },
  approvals: { eyebrow: "Owner gate / 05", title: "Approvals", description: "Filed status, authoritative disposition, consumption, expiry, and scope. Phase 2 can approve/reject/withdraw via allowlisted ADOS tools when enabled." },
  campaigns: { eyebrow: "Autonomy campaign / 06", title: "Campaigns", description: "Cursor-first campaign status, budgets, runtimes, and push/merge/deploy policy — observation only." },
  "owner-gates": { eyebrow: "Protected decision / 07", title: "Owner gates", description: "Open and historical owner-only decisions. Phase 2 uses challenge → external Ed25519 sign → ADOS tool decide. Agents cannot self-approve." },
  workflow: { eyebrow: "Protocol graph / 08", title: "Workflow", description: "Read-only Owner → agent → validation flow derived from the brokered workflow summary. No drag-to-dispatch." },
  handoffs: { eyebrow: "Handoff queue / 09", title: "Handoffs", description: "Per-agent handoff packets, lifecycle stage, and synchronous adapter protocol — observation only." },
  worktrees: { eyebrow: "Repo hygiene / 10", title: "Worktrees", description: "Registered worktrees, dirty/untracked signals, branch/HEAD, and owner agent — no cleanup actions." },
  evidence: { eyebrow: "Trust store / 11", title: "Evidence", description: "Evidence metadata, trust flags, and verification labels. Content bodies are not ingested; hashes are observational." },
  safety: { eyebrow: "Safety monitor / 12", title: "Safety", description: "Active safety signals and severity. Detectors are read-model derived; Mission Control never clears alerts." },
  timeline: { eyebrow: "Trust timeline / 13", title: "Evidence & audit timeline", description: "A filterable chronology separating authoritative results, direct verification, reported claims, and diagnostics." },
  "routing-incidents": { eyebrow: "Containment register / 14", title: "Routing incidents", description: "Cross-project mistakes, repository containment, owner disposition, and recorded resolution." },
  "dead-letter": { eyebrow: "Failure backlog / 15", title: "Dead letter", description: "Repeated failures, blocked tasks, worker-unavailable handoffs, and routing containment still needing owner disposition — derived only, never invented." },
  operations: { eyebrow: "Controlled ops / 16", title: "Controlled operations", description: "Phase 3 dispatch/campaign control and Phase 6 validate/integration/review-pickup via allowlisted ADOS tools. Impossible without APPROVED disposition. Cursor cannot take PRIMARY lease here." },
  fleet: { eyebrow: "Fleet observe / 17", title: "Fleet", description: "Opt-in multi-member observation only. Rows are NON_AUTHORITATIVE and never inherit this cockpit's PRIMARY lease. Metrics: GET /api/v1/metrics." },
  replay: { eyebrow: "Run chronology / 18", title: "Run replay", description: "GET-only chronological replay from evidence/supervisor-runs. Missing runs report UNAVAILABLE — never a fabricated timeline." },
  "evidence-diff": { eyebrow: "Run compare / 19", title: "Evidence diff", description: "GET-only comparison of two supervisor runs under one campaign. Missing runs stay UNAVAILABLE — never a fabricated diff." },
};

function formatTimestamp(value?: string | null, compact = false): string {
  if (!value) return "UNAVAILABLE";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", compact
    ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }
    : { dateStyle: "medium", timeStyle: "short", hour12: false }).format(parsed);
}

function compactPath(value?: string | null, length = 42): string {
  if (!value) return "UNAVAILABLE";
  return value.length <= length ? value : `…${value.slice(-(length - 1))}`;
}

function stateTone(value: string): string {
  const state = value.toUpperCase();
  if (/CRITICAL|FAILED|REVOKED|DENIED|CONTRADICTED|DISCONNECTED/.test(state)) return "critical";
  if (/BLOCKED|EXPIRED|SUPERSEDED|STALE|UNAVAILABLE/.test(state)) return "blocked";
  if (/PENDING|WARNING|AWAITING|UNVERIFIED|DIAGNOSTIC|CACHED|MOCK|INFERRED|DEGRADED|CONNECTING/.test(state)) return "warning";
  if (/SUCCESS|COMPLETED|APPROVED|CONSUMED|READY|VERIFIED|AUTHORITATIVE|LIVE/.test(state)) return "success";
  return "neutral";
}

function FreshnessBadge({ value }: { value: FreshnessLabel }) {
  return <span className={`status-badge tone-${stateTone(value)}`}>{value}</span>;
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge tone-${stateTone(value)}`}>{value.replaceAll("_", " ")}</span>;
}

function VerificationBadge({ value }: { value: VerificationLabel }) {
  return <span className={`verification-badge tone-${stateTone(value)}`}><Fingerprint size={12} />{value.replaceAll("_", " ")}</span>;
}

function Panel({ code, title, meta, children, className = "" }: { code: string; title: string; meta?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <div><span>{code}</span><h2>{title}</h2></div>
        {meta && <p>{meta}</p>}
      </header>
      {children}
    </section>
  );
}

function Metric({ label, value, detail, tone = "neutral", icon: Icon }: { label: string; value: string | number; detail: string; tone?: string; icon: typeof Gauge }) {
  return (
    <article className={`metric tone-${tone}`}>
      <div className="metric-icon"><Icon size={19} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><Archive size={24} /><div><strong>{title}</strong><span>{detail}</span></div></div>;
}

function TableFrame({ children, label = "Scrollable data table" }: { children: ReactNode; label?: string }) {
  return (
    <div className="table-frame" tabIndex={0} role="region" aria-label={label}>
      {children}
    </div>
  );
}

function FilterBar({ query, onQuery, status, onStatus, statuses, label = "Search records" }: {
  query: string;
  onQuery: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  statuses: string[];
  label?: string;
}) {
  return (
    <div className="filter-bar">
      <label className="search-field"><Search size={16} /><span className="sr-only">{label}</span><input aria-label={label} value={query} onChange={(event) => onQuery(event.target.value)} placeholder={label} /></label>
      <label className="select-field"><ListFilter size={15} /><span className="sr-only">Filter by status</span><select aria-label="Filter by status" value={status} onChange={(event) => onStatus(event.target.value)}><option value="ALL">All states</option>{statuses.map((item) => <option value={item} key={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
    </div>
  );
}

function Overview({ snapshot }: { snapshot: MissionSnapshot }) {
  const health = snapshot.systemHealth;
  const activeTask = snapshot.tasks.find((task) => task.status === "RUNNING") || snapshot.tasks.find((task) => task.status === "PENDING");
  const activeProject = snapshot.projects.find((project) => project.currentTask === activeTask?.taskId) || snapshot.projects.find((project) => project.classification === "ADOS_COMPONENT_REPOSITORY");
  const recentExecutions = snapshot.tasks.filter((task) => ["COMPLETED", "FAILED", "BLOCKED"].includes(task.status)).slice(0, 6);
  const blockedTasks = snapshot.tasks.filter((task) => task.status === "BLOCKED");
  const waitingReviews = snapshot.tasks.filter((task) => /REVIEW|AWAITING|CONDITIONAL/i.test(task.status) || /REVIEW|AWAITING/i.test(task.protocolStatus));
  const activeAgents = snapshot.agents.filter((agent) => !/OFFLINE|UNKNOWN|UNAVAILABLE/i.test(agent.availabilityState));
  const conflictSummary = snapshot.conflictSummary || {
    total: 0,
    critical: 0,
    warning: 0,
    dualPrimary: 0,
    staleLease: 0,
    pathConflict: 0,
    worktreeDrift: 0,
    overviewAnswer: "NONE OBSERVED",
  };
  const nineQuestions = [
    { q: "Active agents", a: activeAgents.length ? activeAgents.map((agent) => agent.displayName).join(", ") : "NONE OBSERVED" },
    { q: "Lease holder", a: `${snapshot.primaryLease.orchestrator} · ${snapshot.primaryLease.state}` },
    { q: "Current work", a: activeTask ? `${activeTask.taskId} · ${activeTask.owner}` : "NO ACTIVE TASK VERIFIED" },
    { q: "Blocked tasks", a: blockedTasks.length ? blockedTasks.map((task) => task.taskId).slice(0, 4).join(", ") : "NONE" },
    { q: "Owner attention", a: health.pendingApprovalCount ? `${health.pendingApprovalCount} pending approval(s)` : "NONE" },
    { q: "Path / worktree conflicts", a: conflictSummary.overviewAnswer },
    { q: "Reviews waiting", a: waitingReviews.length ? `${waitingReviews.length} task(s)` : "NONE" },
    { q: "Production dispatch", a: health.dispatchEnabled ? "ENABLED — VERIFY OWNER APPROVAL" : "DISABLED" },
    { q: "System health", a: `${health.severity} · ${health.readiness.replaceAll("_", " ")}` },
  ] as const;

  return (
    <>
      <section className={`readiness-hero tone-${stateTone(health.readiness)}`}>
        <div className="hero-signal"><CircleDot size={18} /><span>MISSION CONTROL READINESS</span></div>
        <div className="hero-main"><div><h2>{health.readiness.replaceAll("_", " ")}</h2><p>{snapshot.source.reachable ? "Authoritative ADOS state is reachable through a fixed, read-only server adapter." : "No authoritative ADOS state is currently reachable."}</p></div><div className="hero-mark"><Hexagon /><span>{health.latestLedgerSequence ?? "—"}</span><small>LEDGER SEQ</small></div></div>
        <dl className="hero-context">
          <div><dt>Active project</dt><dd>{activeProject?.name || "UNAVAILABLE"}</dd></div>
          <div><dt>Active task</dt><dd>{activeTask?.taskId || "NO ACTIVE TASK VERIFIED"}</dd></div>
          <div><dt>Primary authority</dt><dd>{health.primaryAgent}</dd></div>
          <div><dt>Snapshot</dt><dd>{formatTimestamp(snapshot.snapshotAt)}</dd></div>
        </dl>
      </section>

      <section className="nine-questions" aria-label="Nine operational questions">
        {nineQuestions.map((item) => (
          <article key={item.q}>
            <span>{item.q}</span>
            <strong title={item.a}>{item.a}</strong>
          </article>
        ))}
      </section>

      <section className="metric-grid" aria-label="Operational metrics">
        <Metric label="Registered projects" value={snapshot.projects.length} detail={`${snapshot.routingIncidents.length} routing incidents`} tone="cyan" icon={Boxes} />
        <Metric label="Active runtimes" value={health.activeAgentCount} detail={`${snapshot.agents.length} observed`} tone="lime" icon={Bot} />
        <Metric label="Owner actions" value={snapshot.pendingApprovals.length} detail={`${snapshot.approvals.length} approval records`} tone={snapshot.pendingApprovals.length ? "amber" : "lime"} icon={FileCheck2} />
        <Metric label="Current blockers" value={health.blockerCount} detail={`${snapshot.alerts.length} safety signals`} tone={health.blockerCount ? "red" : "lime"} icon={AlertTriangle} />
      </section>

      <div className="dashboard-grid two-thirds">
        <Panel code="OWNER / PRIORITY" title="High-priority owner actions" meta={`${snapshot.ownerActions.length} current`}>
          {snapshot.ownerActions.length ? <ol className="action-list">{snapshot.ownerActions.map((action, index) => <li key={`${action}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{action}</p><ChevronRight size={16} /></li>)}</ol> : <EmptyState title="No current owner action" detail="No unexpired pending approval or critical action was derived from authoritative state." />}
        </Panel>
        <Panel code="LEASE / PRIMARY" title="Authority anchor" meta={snapshot.primaryLease.authority}>
          <div className="lease-card"><div className="lease-orbit"><ShieldCheck size={27} /></div><span>ACTIVE ORCHESTRATOR</span><strong>{snapshot.primaryLease.orchestrator}</strong><StatusBadge value={snapshot.primaryLease.state} /><dl><div><dt>Lease</dt><dd title={snapshot.primaryLease.leaseId}>{compactPath(snapshot.primaryLease.leaseId, 24)}</dd></div><div><dt>Heartbeat</dt><dd>{formatTimestamp(snapshot.primaryLease.heartbeatAt, true)}</dd></div><div><dt>Heartbeat age</dt><dd>{snapshot.primaryLease.heartbeatAgeSeconds == null ? "UNKNOWN" : `${snapshot.primaryLease.heartbeatAgeSeconds}s`} · {(snapshot.primaryLease.heartbeatFreshness || "unknown").toUpperCase()}</dd></div><div><dt>Host process</dt><dd>{snapshot.primaryLease.processLiveness?.alive === true ? "OBSERVED ALIVE" : snapshot.primaryLease.processLiveness?.alive === false ? "NOT OBSERVED" : "NOT OBSERVABLE"}</dd></div></dl></div>
        </Panel>
      </div>

      <div className="dashboard-grid equal">
        <Panel code="EXEC / RECENT" title="Recent execution outcomes" meta={`${recentExecutions.length} visible`}>
          {recentExecutions.length ? <div className="record-list">{recentExecutions.map((task) => <div className="record-row" key={task.taskId}><div className={`record-dot tone-${stateTone(task.status)}`} /><div><strong>{task.taskId}</strong><span>{task.objective}</span></div><div><StatusBadge value={task.status} /><small>{formatTimestamp(task.completedAt, true)}</small></div></div>)}</div> : <EmptyState title="No execution outcomes" detail="No completed, failed, or blocked execution record is available." />}
        </Panel>
        <Panel code="SENTRY / CURRENT" title="Blockers & safety signals" meta={health.severity}>
          {snapshot.alerts.length ? <div className="alert-list">{snapshot.alerts.map((alert) => <div className={`alert-item tone-${stateTone(alert.severity)}`} key={alert.alertId}><AlertTriangle size={17} /><div><strong>{alert.code.replaceAll("_", " ")}</strong><span>{alert.message}</span></div><StatusBadge value={alert.severity} /></div>)}</div> : <EmptyState title="No safety signals" detail="The current read model did not derive an active alert." />}
        </Panel>
      </div>

      <Panel code="CONFLICT / INFERRED" title="Conflict detection" meta={`${conflictSummary.total} derived · never AUTHORITATIVE`}>
        <div className="readonly-banner"><AlertTriangle size={16} /><strong>INFERRED SIGNALS</strong><span>Conflict cards are derived observations. Missing evidence stays UNAVAILABLE — never invented.</span></div>
        {(snapshot.conflicts || []).length ? (
          <div className="incident-grid">
            {(snapshot.conflicts || []).slice(0, 6).map((conflict) => (
              <article className="incident-card" key={conflict.conflictId}>
                <header>
                  <div><AlertTriangle size={18} /><span>{conflict.kind.replaceAll("_", " ")}</span></div>
                  <StatusBadge value={conflict.severity} />
                </header>
                <dl>
                  <div><dt>Title</dt><dd>{conflict.title}</dd></div>
                  <div><dt>Freshness</dt><dd>{conflict.freshness}</dd></div>
                  <div><dt>Owner attention</dt><dd>{conflict.ownerAttentionRequired ? "REQUIRED" : "OPTIONAL"}</dd></div>
                </dl>
                <div className="incident-resolution"><span>DETAIL</span><p>{conflict.detail}</p></div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No conflicts observed" detail="Dual-primary, stale-lease, path, and worktree-drift detectors found no signals." />
        )}
      </Panel>

      <Panel code="TRUST / LATEST" title="Authoritative audit pulse" meta={`${snapshot.auditTimeline.length} entries indexed`}>
        <div className="timeline-list compact">{snapshot.auditTimeline.slice(0, 7).map((entry) => <div className="timeline-entry" key={entry.id}><time>{formatTimestamp(entry.timestamp, true)}</time><span className={`timeline-node tone-${stateTone(entry.severity)}`} /><div><div className="timeline-kicker"><b>{entry.category}</b><VerificationBadge value={entry.verification} /></div><strong>{entry.title.replaceAll("_", " ")}</strong><p>{entry.summary}</p></div></div>)}</div>
      </Panel>
    </>
  );
}

function Projects({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <Panel code="REGISTRY / PROJECTS" title="Known project topology" meta={`${snapshot.projects.length} records`}>
      {snapshot.projects.length ? <TableFrame><table><thead><tr><th>Project</th><th>Classification</th><th>Repository</th><th>Branch / HEAD</th><th>Status</th><th>Blocker / next action</th></tr></thead><tbody>{snapshot.projects.map((project) => <tr key={project.projectId}><td><strong>{project.name}</strong><span title={project.canonicalPath}>{compactPath(project.canonicalPath)}</span>{project.currentTask && <small>Task · {project.currentTask}</small>}</td><td><StatusBadge value={project.classification} /></td><td>{project.repositoryType}<small>{project.authority}</small></td><td><code>{project.branch || "UNAVAILABLE"}</code><span title={project.head || undefined}>{project.head ? project.head.slice(0, 12) : "HEAD UNVERIFIED"}</span></td><td><strong>{project.status.replaceAll("_", " ")}</strong><small>{formatTimestamp(project.lastVerifiedAt, true)}</small></td><td>{project.blocker && <StatusBadge value="BLOCKED" />}<span>{project.blocker || project.nextPermittedAction}</span></td></tr>)}</tbody></table></TableFrame> : <EmptyState title="Project registry unavailable" detail="No project records could be derived from the configured source." />}
    </Panel>
  );
}

function Agents({ snapshot }: { snapshot: MissionSnapshot }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected: AgentCard | null = snapshot.agents.find((agent) => agent.agentId === selectedId) || null;
  return (
    <>
    <div className="card-grid">
      {snapshot.agents.map((agent) => <article className={`agent-card tone-${stateTone(agent.availabilityState)}`} key={agent.agentId} role="button" tabIndex={0} onClick={() => setSelectedId(agent.agentId)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(agent.agentId); } }}>
        <header><div className="agent-glyph"><Bot size={22} /></div><div><span>{agent.role}</span><h2>{agent.displayName}</h2></div><StatusBadge value={agent.availabilityState} /></header>
        <div className="agent-authority"><Fingerprint size={15} /><span>{agent.authority}</span><VerificationBadge value={agent.verificationState} /></div>
        <dl><div><dt>Runtime status</dt><dd>{agent.status.replaceAll("_", " ")}</dd></div><div><dt>Current task</dt><dd>{agent.currentTask || "NO CURRENT TASK"}</dd></div><div><dt>Last execution</dt><dd>{formatTimestamp(agent.lastExecution, true)}</dd></div><div><dt>Result</dt><dd>{agent.executionResult || "NOT REPORTED"}</dd></div><div><dt>Evidence</dt><dd title={agent.evidenceReference || undefined}>{compactPath(agent.evidenceReference, 34)}</dd></div><div><dt>Promotion</dt><dd>{agent.runtimePromotionPending ? "PENDING — NO UI ACTION" : "NOT PENDING"}</dd></div></dl>
        {agent.blockers.length > 0 && <div className="agent-blocker"><ShieldAlert size={15} />{agent.blockers[0]}</div>}
        <footer><span>{agent.cannotAcquireOrchestratorLease ? "LEASE ACQUISITION PROHIBITED" : "PRIMARY LEASE HOLDER"}</span><small>Open detail</small></footer>
      </article>)}
      {!snapshot.agents.length && <EmptyState title="Runtime registry unavailable" detail="No agent sessions were derived from the configured source." />}
    </div>
    {selected && (
      <Panel code="AGENT / DETAIL" title={`${selected.displayName} detail`} meta="READ-ONLY DRAWER">
        <div className="readonly-banner">
          <Bot size={16} />
          <strong>NO PROMOTE / LEASE CONTROLS</strong>
          <span>{selected.agentId === "cursor" ? "Cursor remains NON-AUTHORITATIVE and cannot acquire PRIMARY lease." : "Detail view is observation only."}</span>
          <button type="button" onClick={() => setSelectedId(null)} aria-label="Close agent detail">Close</button>
        </div>
        <dl className="approval-meta">
          <div><dt>Agent ID</dt><dd>{selected.agentId}</dd></div>
          <div><dt>Role / authority</dt><dd>{selected.role} · {selected.authority}</dd></div>
          <div><dt>Protocol / status</dt><dd>{selected.status} · {selected.availabilityState}</dd></div>
          <div><dt>Session</dt><dd>{selected.sessionIdentity || "UNAVAILABLE"}</dd></div>
          <div><dt>Registration</dt><dd>{selected.registration || "UNAVAILABLE"}</dd></div>
          <div><dt>Worktree / branch</dt><dd>{selected.worktree || "UNAVAILABLE"} · {selected.branch || "UNAVAILABLE"}</dd></div>
          <div><dt>Last execution</dt><dd>{formatTimestamp(selected.lastExecution)} · {selected.executionResult || "NOT REPORTED"}</dd></div>
          <div><dt>Promotion</dt><dd>{selected.runtimePromotionPending ? "PENDING — NO UI ACTION" : "NOT PENDING"}</dd></div>
          <div><dt>Heartbeat label</dt><dd>{selected.heartbeatLabel || "UNAVAILABLE"}</dd></div>
          <div><dt>Permitted</dt><dd>{selected.permittedActions.join(", ") || "NONE LISTED"}</dd></div>
          <div><dt>Prohibited</dt><dd>{selected.prohibitedActions.join(", ") || "NONE LISTED"}</dd></div>
        </dl>
      </Panel>
    )}
    </>
  );
}

function TaskDependencyGraphPanel({ snapshot }: { snapshot: MissionSnapshot }) {
  const graph = useMemo(() => buildTaskDependencyGraph(snapshot.tasks), [snapshot.tasks]);
  return (
    <Panel code="MISSION / DEPS" title="Task dependency graph" meta={`${graph.edges.length} edge${graph.edges.length === 1 ? "" : "s"} · ${graph.unresolvedDependencyIds.length} unresolved`}>
      <div className="readonly-banner">
        <GitBranch size={16} />
        <strong>SNAPSHOT EDGES ONLY</strong>
        <span>Edges come from task.dependencies. Missing dependency IDs are listed as unresolved — never invented as tasks.</span>
      </div>
      {graph.edges.length ? (
        <>
          <ul className="dependency-edge-list" aria-label="Task dependency edges">
            {graph.edges.map((edge) => (
              <li key={`${edge.fromTaskId}->${edge.toTaskId}`}>
                <code>{edge.fromTaskId}</code>
                <ChevronRight size={16} aria-hidden />
                <code>{edge.toTaskId}</code>
                <StatusBadge value={edge.resolved ? "RESOLVED" : "UNRESOLVED"} />
              </li>
            ))}
          </ul>
          {graph.unresolvedDependencyIds.length > 0 && (
            <div className="dependency-unresolved" aria-label="Unresolved dependency ids">
              <span>UNRESOLVED DEPENDENCY IDS</span>
              {graph.unresolvedDependencyIds.map((id) => <code key={id}>{id}</code>)}
            </div>
          )}
        </>
      ) : (
        <EmptyState title="No dependency edges" detail="No task.dependencies were present in the current snapshot." />
      )}
    </Panel>
  );
}

function Tasks({ snapshot, query, setQuery, status, setStatus }: { snapshot: MissionSnapshot; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void }) {
  const statuses = [...new Set(snapshot.tasks.map((task) => task.status))];
  const items = snapshot.tasks.filter((task) => (status === "ALL" || task.status === status) && `${task.taskId} ${task.project} ${task.owner} ${task.objective}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <Panel code="MISSION / QUEUE" title="Task contracts & executions" meta={`${items.length} of ${snapshot.tasks.length}`}>
        <FilterBar query={query} onQuery={setQuery} status={status} onStatus={setStatus} statuses={statuses} label="Search task, project, agent, or objective" />
        {items.length ? (
          <TableFrame>
            <table>
              <thead>
                <tr>
                  <th>Task / project</th>
                  <th>Agent / status / risk</th>
                  <th>Approval / launches</th>
                  <th>Protocol / result</th>
                  <th>Evidence</th>
                  <th>Next permitted action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((task) => {
                  const risk = scoreTaskRisk(task);
                  return (
                    <tr key={task.taskId}>
                      <td>
                        <strong>{task.taskId}</strong>
                        <span>{task.project}</span>
                        <small>{task.objective}</small>
                      </td>
                      <td>
                        <strong>{task.owner}</strong>
                        <StatusBadge value={task.status} />
                        <small>{task.role || "ROLE UNVERIFIED"}</small>
                        <small>
                          Risk {risk.band} ({risk.freshness})
                        </small>
                      </td>
                      <td>
                        <code>{task.approvalRef || "NO APPROVAL REF"}</code>
                        <span>
                          {task.launchCount} launch{task.launchCount === 1 ? "" : "s"}
                        </span>
                        <small>
                          {formatTimestamp(task.startedAt, true)} → {formatTimestamp(task.completedAt, true)}
                        </small>
                      </td>
                      <td>
                        <strong>{task.protocolStatus.replaceAll("_", " ")}</strong>
                        <span>{task.exitResult || "NOT REPORTED"}</span>
                        <VerificationBadge value={task.verification} />
                      </td>
                      <td>
                        {task.evidencePaths.length ? (
                          task.evidencePaths.map((item) => (
                            <code key={item} title={item}>
                              {compactPath(item, 30)}
                            </code>
                          ))
                        ) : (
                          <span>UNAVAILABLE</span>
                        )}
                      </td>
                      <td>{task.nextPermittedAction}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableFrame>
        ) : (
          <EmptyState title="No matching tasks" detail="Adjust the task search or status filter." />
        )}
      </Panel>
      <TaskDependencyGraphPanel snapshot={snapshot} />
    </>
  );
}

function Approvals({ snapshot, query, setQuery, status, setStatus }: { snapshot: MissionSnapshot; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void }) {
  const phase2 = snapshot.capabilities?.phase2Commands === true;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const statuses = [...new Set(snapshot.approvals.map((approval) => approval.status))];
  const items = snapshot.approvals.filter((approval) => (status === "ALL" || approval.status === status) && `${approval.approvalId} ${approval.action} ${approval.scopeSummary}`.toLowerCase().includes(query.toLowerCase()));

  const router = useRouter();
  const runAction = async (approvalId: string, action: "approve" | "reject" | "withdraw") => {
    if (!phase2) return;
    const confirmed = window.confirm(`Confirm owner ${action.toUpperCase()} for ${approvalId} via ADOS tools?\n\nThis appends a disposition ledger event. Mission Control does not write state/* directly.`);
    if (!confirmed) return;
    setBusyId(approvalId);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/v1/approvals/${encodeURIComponent(approvalId)}/${action}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `${action}-${approvalId}-${Date.now()}`,
        },
        body: JSON.stringify({ justification: `Owner ${action} via Mission Control Phase 2` }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionMessage(payload?.error?.message || `Failed to ${action} ${approvalId}`);
      } else {
        setActionMessage(`${action.toUpperCase()} recorded for ${approvalId}. Refreshing snapshot…`);
        router.refresh();
      }
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : `Failed to ${action}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel code="GATE / OWNER" title="Approval reconciliation" meta={`${items.length} of ${snapshot.approvals.length}`}>
      <div className="readonly-banner">
        <ShieldCheck size={16} />
        <strong>{phase2 ? "PHASE 2 COMMANDS" : "READ-ONLY V1"}</strong>
        <span>
          {phase2
            ? "Approve / Reject / Withdraw invoke allowlisted ADOS tools (append-only dispositions). No raw state/* writes from Next.js."
            : "Approve / Reject remain disabled until MISSION_CONTROL_PHASE2_COMMANDS=enabled."}
        </span>
      </div>
      {actionMessage && <div className="source-notice tone-warning" role="status"><strong>COMMAND RESULT</strong><span>{actionMessage}</span></div>}
      <FilterBar query={query} onQuery={setQuery} status={status} onStatus={setStatus} statuses={statuses} label="Search approval ID, action, or scope" />
      {items.length ? (
        <div className="approval-stack">
          {items.map((approval: ApprovalCard) => (
            <article className="approval-card" key={approval.approvalId}>
              <header>
                <div>
                  <code className="full-id">{approval.approvalId}</code>
                  <strong>{approval.action.replaceAll("_", " ")}</strong>
                  <small>{approval.requestingAgent || approval.issuedBy || "REQUESTER UNAVAILABLE"}</small>
                </div>
                <div className="approval-actions-preview">
                  <button type="button" disabled={!phase2 || busyId === approval.approvalId || approval.status !== "PENDING"} onClick={() => runAction(approval.approvalId, "approve")} title={phase2 ? "Approve via ADOS disposition tool" : "Phase 2 disabled"}>Approve</button>
                  <button type="button" disabled={!phase2 || busyId === approval.approvalId || approval.status !== "PENDING"} onClick={() => runAction(approval.approvalId, "reject")} title={phase2 ? "Reject via ADOS disposition tool" : "Phase 2 disabled"}>Reject</button>
                  <button type="button" disabled={!phase2 || busyId === approval.approvalId || !["PENDING", "APPROVED"].includes(approval.status)} onClick={() => runAction(approval.approvalId, "withdraw")} title={phase2 ? "Withdraw/revoke via ADOS disposition tool" : "Phase 2 disabled"}>Withdraw</button>
                  <StatusBadge value={approval.status} />
                </div>
              </header>
              <dl className="approval-meta">
                <div><dt>Filed vs ledger</dt><dd>Filed · {approval.fileStatus} · Ledger · {approval.authoritativeDisposition}</dd></div>
                <div><dt>Risk / consumption</dt><dd>{(() => { const risk = scoreApprovalRisk(approval); return `${risk.band} (${risk.freshness}${risk.fromControlPlane ? " · control-plane" : " · derived"})`; })()} · {approval.consumed ? "CONSUMED" : "UNCONSUMED"} ({approval.consumptionCount}/{approval.executionLimit ?? "∞"})</dd></div>
                <div><dt>Issue / expiry</dt><dd>{formatTimestamp(approval.issuedAt)} → {formatTimestamp(approval.expiresAt)}</dd></div>
                <div><dt>Scope</dt><dd>{approval.scopeSummary || "SCOPE UNAVAILABLE"}{approval.ownerActionRequired ? " · OWNER ACTION REQUIRED" : ""}</dd></div>
              </dl>
              {(() => {
                const digest = summarizeApproval(approval);
                return (
                  <div className="incident-resolution" aria-label={`Approval summary ${approval.approvalId}`}>
                    <span>INTELLIGENT SUMMARY · {digest.freshness}</span>
                    <p><strong>{digest.headline}</strong></p>
                    <p>Blast radius: {digest.blastRadius}</p>
                    <ul>{digest.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                  </div>
                );
              })()}
              <div className="consequence-grid">
                <div>
                  <span>Will do</span>
                  {approval.willDo.length ? <ul>{approval.willDo.map((item) => <li key={item}>{item}</li>)}</ul> : <p>UNAVAILABLE</p>}
                </div>
                <div>
                  <span>Will not do</span>
                  {approval.willNotDo.length ? <ul>{approval.willNotDo.map((item) => <li key={item}>{item}</li>)}</ul> : <p>UNAVAILABLE</p>}
                </div>
                <div>
                  <span>Affected paths</span>
                  {approval.affectedPaths.length ? <ul>{approval.affectedPaths.map((item) => <li key={item} title={item}>{compactPath(item, 48)}</li>)}</ul> : <p>UNAVAILABLE</p>}
                </div>
                <div>
                  <span>Preconditions</span>
                  {approval.preconditions.length ? <ul>{approval.preconditions.map((item) => <li key={item}>{item}</li>)}</ul> : <p>UNAVAILABLE</p>}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No matching approvals" detail="Adjust the approval search or state filter." />
      )}
    </Panel>
  );
}

function Timeline({ snapshot, query, setQuery, status, setStatus }: { snapshot: MissionSnapshot; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void }) {
  const categories = [...new Set(snapshot.auditTimeline.map((entry) => entry.category))];
  const items = snapshot.auditTimeline.filter((entry) => (status === "ALL" || entry.category === status) && `${entry.title} ${entry.summary} ${entry.verification}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Panel code="AUDIT / CHRONOLOGY" title="Operational evidence timeline" meta={`${items.length} of ${snapshot.auditTimeline.length}`}>
      <FilterBar query={query} onQuery={setQuery} status={status} onStatus={setStatus} statuses={categories} label="Search event, evidence, or verification label" />
      {items.length ? <div className="timeline-list">{items.map((entry: AuditEntry) => <article className="timeline-entry" key={entry.id}><time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time><span className={`timeline-node tone-${stateTone(entry.severity)}`} /><div><div className="timeline-kicker"><b>{entry.category}</b><StatusBadge value={entry.severity} /><VerificationBadge value={entry.verification} /></div><h2>{entry.title.replaceAll("_", " ")}</h2><p>{entry.summary}</p>{entry.evidenceReference && <code title={entry.evidenceReference}>{compactPath(entry.evidenceReference, 70)}</code>}</div></article>)}</div> : <EmptyState title="No matching audit entries" detail="Adjust the evidence search or category filter." />}
    </Panel>
  );
}

function RoutingIncidents({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <Panel code="ROUTING / CONTAINMENT" title="Cross-project incident register" meta={`${snapshot.routingIncidents.length} recorded`}>
      {snapshot.routingIncidents.length ? <div className="incident-grid">{snapshot.routingIncidents.map((incident) => <article className="incident-card" key={incident.incidentId}><header><div><Waypoints size={18} /><span>{incident.incidentId}</span></div><StatusBadge value={incident.containmentStatus} /></header><dl><div><dt>Intended project</dt><dd>{incident.intendedProject}</dd></div><div><dt>Incorrect repository</dt><dd title={incident.incorrectRepository}>{compactPath(incident.incorrectRepository, 58)}</dd></div><div><dt>Branch / commit</dt><dd>{incident.branch || "UNAVAILABLE"} · {incident.commit?.slice(0, 12) || "UNAVAILABLE"}</dd></div><div><dt>Owner disposition</dt><dd>{incident.ownerDispositionRequired ? "REQUIRED" : "NOT CURRENTLY REQUIRED"}</dd></div></dl><div className="incident-resolution"><span>FINAL RESOLUTION / CURRENT RECORD</span><p>{incident.resolution}</p></div><VerificationBadge value={incident.verification} /></article>)}</div> : <EmptyState title="No routing incident record" detail="No cross-project repository mistake was derived from current authoritative state." />}
    </Panel>
  );
}

type FleetApiMember = {
  id: string;
  label: string;
  role: string;
  reachable: boolean;
  readiness: string;
  primaryAgent: string;
  freshness: string;
  detail: string;
  authority: string;
};

type FleetApiResponse = {
  enabled: boolean;
  configured: boolean;
  members: FleetApiMember[];
  warnings: string[];
  authority?: string;
  note?: string;
};

function Fleet({ snapshot }: { snapshot: MissionSnapshot }) {
  const fleetMode = snapshot.capabilities?.fleetMode === true;
  const [projection, setProjection] = useState<FleetApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/v1/fleet")
      .then(async (response) => {
        const payload = (await response.json()) as FleetApiResponse & { error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message || "Fleet probe failed");
        if (!cancelled) setProjection(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Fleet probe failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fleetMode]);

  return (
    <Panel code="FLEET / PHASE-4" title="Fleet observation" meta={fleetMode ? "FLEET MODE ENABLED" : "FLEET MODE DISABLED"}>
      <div className="readonly-banner">
        <Network size={16} />
        <strong>{fleetMode ? "NON-AUTHORITATIVE PROBES" : "FLEET OFF"}</strong>
        <span>
          {fleetMode
            ? "Member health never grants PRIMARY lease, approve, or dispatch authority to this cockpit. Prometheus counters: GET /api/v1/metrics."
            : "Set MISSION_CONTROL_FLEET_MODE=enabled and MISSION_CONTROL_FLEET_CONFIG to activate observation."}
        </span>
      </div>
      {loading && <EmptyState title="Probing fleet members" detail="Loading configured member status…" />}
      {error && <div className="source-notice tone-critical" role="status"><strong>FLEET ERROR</strong><span>{error}</span></div>}
      {projection?.warnings?.length ? (
        <div className="source-notice tone-warning" role="status">
          <strong>FLEET WARNINGS</strong>
          <span>{projection.warnings.join(" · ")}</span>
        </div>
      ) : null}
      {projection && !loading && (
        projection.members.length ? (
          <div className="incident-grid">
            {projection.members.map((member) => (
              <article className="incident-card" key={member.id}>
                <header>
                  <div>
                    <Network size={18} />
                    <span>{member.label}</span>
                  </div>
                  <StatusBadge value={member.reachable ? "REACHABLE" : "UNREACHABLE"} />
                </header>
                <dl>
                  <div><dt>Member ID</dt><dd>{member.id}</dd></div>
                  <div><dt>Role</dt><dd>{member.role}</dd></div>
                  <div><dt>Readiness</dt><dd>{member.readiness}</dd></div>
                  <div><dt>Primary agent (observed)</dt><dd>{member.primaryAgent}</dd></div>
                  <div><dt>Freshness</dt><dd>{member.freshness}</dd></div>
                  <div><dt>Authority</dt><dd>{member.authority}</dd></div>
                </dl>
                <div className="incident-resolution">
                  <span>PROBE DETAIL</span>
                  <p>{member.detail}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No fleet members"
            detail={projection.enabled ? "Fleet mode is on but no members were returned." : "Fleet mode is disabled."}
          />
        )
      )}
      <div className="incident-resolution">
        <span>DOCS</span>
        <p>Grafana stub: docs/grafana/mission-control-overview.json · ADR: docs/adr/ADR-001-fleet-and-prometheus.md</p>
      </div>
    </Panel>
  );
}

function Operations({ snapshot }: { snapshot: MissionSnapshot }) {
  const phase3 = snapshot.capabilities?.phase3Commands === true;
  const phase6 = snapshot.capabilities?.phase6Commands === true;
  const [approvalId, setApprovalId] = useState(snapshot.approvals.find((item) => item.status === "APPROVED")?.approvalId || "");
  const [taskId, setTaskId] = useState(snapshot.tasks[0]?.taskId || "");
  const [runtime, setRuntime] = useState<"cursor" | "codex" | "kimi">("codex");
  const [mode, setMode] = useState<"prepare" | "queue">("prepare");
  const [campaignId, setCampaignId] = useState(snapshot.campaigns[0]?.campaignId || "");
  const [campaignApprovalId, setCampaignApprovalId] = useState("");
  const [validateApprovalId, setValidateApprovalId] = useState("");
  const [validateTaskId, setValidateTaskId] = useState(snapshot.tasks[0]?.taskId || "");
  const [integrationApprovalId, setIntegrationApprovalId] = useState("");
  const [projectId, setProjectId] = useState(snapshot.projects[0]?.projectId || "");
  const [integrationSummary, setIntegrationSummary] = useState("");
  const [pickupApprovalId, setPickupApprovalId] = useState("");
  const [pickupTaskId, setPickupTaskId] = useState(snapshot.tasks[0]?.taskId || "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const postOp = async (path: string, body: Record<string, string | undefined>, okLabel: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `${path}-${Date.now()}` },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      setMessage(
        response.ok
          ? `${okLabel}: ${payload.tool?.operationId || "ok"}`
          : payload?.error?.message || `${okLabel} denied`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${okLabel} failed`);
    } finally {
      setBusy(false);
    }
  };

  const dispatch = async () => {
    if (!phase3) return;
    await postOp("/api/v1/operations/dispatch", { approvalId, taskId, runtime, mode }, `Dispatch ${mode} accepted`);
  };

  const campaignControl = async (control: "PAUSE" | "RESUME") => {
    if (!phase3) return;
    await postOp(
      "/api/v1/operations/campaign-control",
      { approvalId: campaignApprovalId, campaignId, control },
      `Campaign ${control} recorded`,
    );
  };

  return (
    <>
    <Panel code="OPS / PHASE-3" title="Approved-only controlled operations" meta={phase3 ? "PHASE 3 ENABLED" : "PHASE 3 DISABLED"}>
      <div className="readonly-banner">
        <Play size={16} />
        <strong>{phase3 ? "APPROVED DISPATCH ONLY" : "NO PHASE 3 ACTION"}</strong>
        <span>
          {phase3
            ? "Operations require an APPROVED disposition. Cursor cannot acquire PRIMARY lease through this surface. Live adapter launch remains outside MC (prepare/queue only)."
            : "Set MISSION_CONTROL_PHASE3_COMMANDS=enabled after owner authorization to use this surface."}
        </span>
      </div>
      {message && <div className="source-notice tone-warning" role="status"><strong>OPERATION RESULT</strong><span>{message}</span></div>}

      <div className="owner-gate-workflow" aria-label="Approved worker dispatch">
        <strong>Worker dispatch (prepare / queue)</strong>
        <label className="search-field">
          <span className="sr-only">Approval ID</span>
          <input aria-label="Dispatch approval ID" value={approvalId} onChange={(event) => setApprovalId(event.target.value)} placeholder="approvalId (must be APPROVED)" disabled={!phase3} />
        </label>
        <label className="search-field">
          <span className="sr-only">Task ID</span>
          <input aria-label="Dispatch task ID" value={taskId} onChange={(event) => setTaskId(event.target.value)} placeholder="taskId" disabled={!phase3} />
        </label>
        <label>
          <span className="sr-only">Runtime</span>
          <select aria-label="Dispatch runtime" value={runtime} onChange={(event) => setRuntime(event.target.value as "cursor" | "codex" | "kimi")} disabled={!phase3}>
            <option value="cursor">cursor</option>
            <option value="codex">codex</option>
            <option value="kimi">kimi</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Mode</span>
          <select aria-label="Dispatch mode" value={mode} onChange={(event) => setMode(event.target.value as "prepare" | "queue")} disabled={!phase3}>
            <option value="prepare">prepare (packet only)</option>
            <option value="queue">queue (write agent inbox contract)</option>
          </select>
        </label>
        <button type="button" disabled={!phase3 || busy || !approvalId || !taskId} onClick={dispatch}>Request approved dispatch</button>
      </div>

      <div className="owner-gate-workflow" aria-label="Campaign pause resume">
        <strong>Campaign pause / resume</strong>
        <label className="search-field">
          <span className="sr-only">Campaign approval ID</span>
          <input aria-label="Campaign control approval ID" value={campaignApprovalId} onChange={(event) => setCampaignApprovalId(event.target.value)} placeholder="approvalId (CAMPAIGN/PAUSE/RESUME)" disabled={!phase3} />
        </label>
        <label className="search-field">
          <span className="sr-only">Campaign ID</span>
          <input aria-label="Campaign ID" value={campaignId} onChange={(event) => setCampaignId(event.target.value)} placeholder="campaignId" disabled={!phase3} />
        </label>
        <div className="approval-actions-preview">
          <button type="button" disabled={!phase3 || busy || !campaignApprovalId || !campaignId} onClick={() => campaignControl("PAUSE")}>Pause</button>
          <button type="button" disabled={!phase3 || busy || !campaignApprovalId || !campaignId} onClick={() => campaignControl("RESUME")}>Resume</button>
        </div>
      </div>
    </Panel>

    <Panel code="OPS / PHASE-6" title="Phase 6 controlled ops completeness" meta={phase6 ? "PHASE 6 ENABLED" : "PHASE 6 DISABLED"}>
      <div className="readonly-banner">
        <ShieldCheck size={16} />
        <strong>{phase6 ? "APPROVED VALIDATE / INTEGRATION / REVIEW PICKUP" : "NO PHASE 6 ACTION"}</strong>
        <span>
          {phase6
            ? "Each action requires a matching APPROVED disposition. Prepare/file packets only — no silent dispatch enablement, no Cursor PRIMARY/lease path."
            : "Set MISSION_CONTROL_PHASE6_COMMANDS=enabled after owner authorization to use this surface."}
        </span>
      </div>

      <div className="owner-gate-workflow" aria-label="Approved validator run">
        <strong>Validator run (prepare)</strong>
        <label className="search-field">
          <span className="sr-only">Validate approval ID</span>
          <input aria-label="Validate approval ID" value={validateApprovalId} onChange={(event) => setValidateApprovalId(event.target.value)} placeholder="approvalId (VALIDATE/VALIDATION)" disabled={!phase6} />
        </label>
        <label className="search-field">
          <span className="sr-only">Validate task ID</span>
          <input aria-label="Validate task ID" value={validateTaskId} onChange={(event) => setValidateTaskId(event.target.value)} placeholder="taskId (optional)" disabled={!phase6} />
        </label>
        <button
          type="button"
          disabled={!phase6 || busy || !validateApprovalId}
          onClick={() =>
            postOp(
              "/api/v1/operations/validate",
              { approvalId: validateApprovalId, ...(validateTaskId ? { taskId: validateTaskId } : {}) },
              "Validator prepare accepted",
            )
          }
        >
          Request approved validate
        </button>
      </div>

      <div className="owner-gate-workflow" aria-label="Approved integration request">
        <strong>Integration request (file)</strong>
        <label className="search-field">
          <span className="sr-only">Integration approval ID</span>
          <input aria-label="Integration approval ID" value={integrationApprovalId} onChange={(event) => setIntegrationApprovalId(event.target.value)} placeholder="approvalId (INTEGRATION)" disabled={!phase6} />
        </label>
        <label className="search-field">
          <span className="sr-only">Project ID</span>
          <input aria-label="Integration project ID" value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder="projectId" disabled={!phase6} />
        </label>
        <label className="search-field">
          <span className="sr-only">Summary</span>
          <input aria-label="Integration summary" value={integrationSummary} onChange={(event) => setIntegrationSummary(event.target.value)} placeholder="summary (optional)" disabled={!phase6} />
        </label>
        <button
          type="button"
          disabled={!phase6 || busy || !integrationApprovalId || !projectId}
          onClick={() =>
            postOp(
              "/api/v1/operations/integration-request",
              {
                approvalId: integrationApprovalId,
                projectId,
                ...(integrationSummary ? { summary: integrationSummary } : {}),
              },
              "Integration request filed",
            )
          }
        >
          File approved integration request
        </button>
      </div>

      <div className="owner-gate-workflow" aria-label="Approved review pickup">
        <strong>Review pickup (bounded prepare)</strong>
        <label className="search-field">
          <span className="sr-only">Review pickup approval ID</span>
          <input aria-label="Review pickup approval ID" value={pickupApprovalId} onChange={(event) => setPickupApprovalId(event.target.value)} placeholder="approvalId (REVIEW_PICKUP)" disabled={!phase6} />
        </label>
        <label className="search-field">
          <span className="sr-only">Review pickup task ID</span>
          <input aria-label="Review pickup task ID" value={pickupTaskId} onChange={(event) => setPickupTaskId(event.target.value)} placeholder="taskId" disabled={!phase6} />
        </label>
        <button
          type="button"
          disabled={!phase6 || busy || !pickupApprovalId || !pickupTaskId}
          onClick={() =>
            postOp(
              "/api/v1/operations/review-pickup",
              { approvalId: pickupApprovalId, taskId: pickupTaskId },
              "Review pickup prepared",
            )
          }
        >
          Request approved review pickup
        </button>
      </div>
    </Panel>
    </>
  );
}

function DeadLetter({ snapshot }: { snapshot: MissionSnapshot }) {
  const projection = useMemo(() => buildDeadLetterProjection(snapshot), [snapshot]);
  return (
    <Panel
      code="FAILURE / DEAD-LETTER"
      title="Dead letter & repeated failures"
      meta={`${projection.items.length} derived · ${projection.summary.repeatedFailures} repeated · freshness ${projection.freshness}`}
    >
      <div className="readonly-banner">
        <OctagonAlert size={16} />
        <strong>DERIVED ONLY</strong>
        <span>Built from existing task/handoff/routing projections. Mission Control never invents failures or clears them. Also available at GET /api/v1/dead-letter.</span>
      </div>
      <div className="dead-letter-summary" aria-label="Dead letter summary">
        <span>Repeated {projection.summary.repeatedFailures}</span>
        <span>Terminal {projection.summary.terminalFailures}</span>
        <span>Blocked {projection.summary.blocked}</span>
        <span>Worker unavailable {projection.summary.workerUnavailable}</span>
        <span>Routing disposition {projection.summary.routingContainment}</span>
      </div>
      {projection.items.length ? (
        <div className="incident-grid" aria-label="Dead letter items">
          {projection.items.map((item: DeadLetterItem) => (
            <article className="incident-card" key={item.id}>
              <header>
                <div><OctagonAlert size={18} /><span>{item.title}</span></div>
                <StatusBadge value={item.kind} />
              </header>
              <dl>
                <div><dt>Source</dt><dd>{item.source}</dd></div>
                <div><dt>Status / launches</dt><dd>{item.status || "UNAVAILABLE"} · {item.launchCount == null ? "LAUNCHES UNAVAILABLE" : `${item.launchCount} launch(es)`}</dd></div>
                <div><dt>Project / task</dt><dd>{item.project || "PROJECT UNAVAILABLE"} · {item.taskId || "NO TASK ID"}</dd></div>
                <div><dt>Owner action</dt><dd>{item.ownerActionRequired ? "REQUIRED" : "NOT CURRENTLY REQUIRED"}</dd></div>
              </dl>
              <div className="incident-resolution">
                <span>SUMMARY / NEXT</span>
                <p>{item.summary}</p>
                <p>{item.nextPermittedAction}</p>
              </div>
              {item.evidencePaths.length > 0 && (
                <div className="record-list">
                  {item.evidencePaths.map((pathValue) => (
                    <div className="record-row" key={pathValue}>
                      <div className="record-dot tone-critical" />
                      <div>
                        <strong>Evidence</strong>
                        <span title={pathValue}>{compactPath(pathValue, 48)}</span>
                      </div>
                      <Link href="/evidence">Open evidence</Link>
                    </div>
                  ))}
                </div>
              )}
              {item.taskId && (
                <div className="dead-letter-links">
                  <Link href={`/tasks?q=${encodeURIComponent(item.taskId)}`}>View task</Link>
                  <Link href="/replay">Open replay</Link>
                </div>
              )}
              <VerificationBadge value={item.verification} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No dead-letter records" detail="No repeated failures, blocked tasks, worker-unavailable handoffs, or owner-disposition routing incidents were derived." />
      )}
    </Panel>
  );
}

function Workflow({ snapshot }: { snapshot: MissionSnapshot }) {
  const nodes = snapshot.workflowSummary?.nodes ?? [];
  const activeEdge = snapshot.workflowSummary?.activeEdge || "UNAVAILABLE";
  const protocol = snapshot.protocol;
  return (
    <>
      <div className="readonly-banner"><ShieldCheck size={16} /><strong>READ-ONLY V2</strong><span>Workflow is observational. Dispatch, acknowledgment, and completion remain control-plane adapter concerns.</span></div>
      <Panel code="WORKFLOW / PATH" title="Synchronous adapter path" meta={`${nodes.length} nodes · ${protocol.dispatchModel}`}>
        {nodes.length ? (
          <ol className="workflow-flow" aria-label="Workflow nodes">
            {nodes.map((node, index) => (
              <li className="workflow-node" key={`${index}-${node}`}>
                <span className="workflow-index">{String(index + 1).padStart(2, "0")}</span>
                <strong>{node}</strong>
                {index < nodes.length - 1 && <ChevronRight className="workflow-arrow" size={18} aria-hidden />}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="Workflow unavailable" detail="No workflowSummary.nodes were derived from the configured source." />
        )}
      </Panel>
      <div className="dashboard-grid equal">
        <Panel code="WORKFLOW / EDGE" title="Active edge" meta="derived">
          <div className="workflow-active-edge">
            <Network size={18} />
            <div>
              <span>CURRENT OBSERVED EDGE</span>
              <strong>{activeEdge}</strong>
            </div>
          </div>
        </Panel>
        <Panel code="WORKFLOW / PROTOCOL" title="Protocol contract" meta="GET /api/v1/workflow">
          <dl className="workflow-protocol">
            <div><dt>Dispatch model</dt><dd>{protocol.dispatchModel}</dd></div>
            <div><dt>Cursor inbox</dt><dd><code>{protocol.cursorInbox}</code></dd></div>
            <div><dt>Cursor completed</dt><dd><code>{protocol.cursorCompleted}</code></dd></div>
            <div><dt>Ack sentinel</dt><dd><code>{protocol.acknowledgmentSentinel}</code></dd></div>
            <div><dt>Completion sentinel</dt><dd><code>{protocol.completionSentinel}</code></dd></div>
            <div><dt>Outbox protocol</dt><dd>{protocol.outboxProtocolCreated ? "CREATED" : "NOT CREATED"}</dd></div>
          </dl>
        </Panel>
      </div>
    </>
  );
}

function Handoffs({ snapshot, query, setQuery, status, setStatus }: { snapshot: MissionSnapshot; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void }) {
  const stages = [...new Set(snapshot.handoffs.map((item) => item.lifecycleStage))];
  const items = snapshot.handoffs.filter((item) => (
    (status === "ALL" || item.lifecycleStage === status)
    && `${item.handoffId} ${item.fromAgent} ${item.toAgent} ${item.title} ${item.taskId || ""}`.toLowerCase().includes(query.toLowerCase())
  ));
  return (
    <Panel code="HANDOFF / QUEUE" title="Agent handoff queue" meta={`${items.length} of ${snapshot.handoffs.length}`}>
      <FilterBar query={query} onQuery={setQuery} status={status} onStatus={setStatus} statuses={stages} label="Search handoff, agent, or task" />
      {items.length ? (
        <TableFrame label="Scrollable handoffs table">
          <table>
            <thead>
              <tr>
                <th>Handoff / title</th>
                <th>From → to</th>
                <th>Lifecycle</th>
                <th>Task / expiry</th>
                <th>Path / digest</th>
                <th>Authority</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: HandoffItem) => (
                <tr key={item.handoffId}>
                  <td><code className="full-id">{item.handoffId}</code><strong>{item.title}</strong></td>
                  <td><strong>{item.fromAgent}</strong><span>→ {item.toAgent}</span></td>
                  <td><StatusBadge value={item.lifecycleStage} /><StatusBadge value={item.status} /></td>
                  <td><span>{item.taskId || "NO TASK ID"}</span><small>{formatTimestamp(item.expiresAt, true)}</small></td>
                  <td><span title={item.path || undefined}>{compactPath(item.path, 36)}</span><small>{item.sha256 ? item.sha256.slice(0, 12) : "DIGEST UNAVAILABLE"}</small></td>
                  <td><StatusBadge value={item.authority} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      ) : (
        <EmptyState title="No matching handoffs" detail="Adjust the handoff search or lifecycle filter." />
      )}
    </Panel>
  );
}

function Worktrees({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <Panel code="REPO / WORKTREES" title="Registered worktrees" meta={`${snapshot.worktrees.length} nodes`}>
      <div className="readonly-banner"><FolderGit2 size={16} /><strong>READ-ONLY</strong><span>Cleanup, prune, and commit actions remain control-plane / owner tools.</span></div>
      {snapshot.worktrees.length ? (
        <TableFrame label="Scrollable worktrees table">
          <table>
            <thead>
              <tr>
                <th>Repo / role</th>
                <th>Path</th>
                <th>Branch / HEAD</th>
                <th>Dirty / untracked</th>
                <th>Owner</th>
                <th>Remote / prune</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.worktrees.map((tree: WorktreeNode) => (
                <tr key={`${tree.repoId}-${tree.pathWindows}`}>
                  <td><strong>{tree.repoId}</strong><span>{tree.role}</span></td>
                  <td><span title={tree.pathWindows}>{compactPath(tree.pathWindows, 42)}</span>{tree.pathWsl && <small title={tree.pathWsl}>{compactPath(tree.pathWsl, 42)}</small>}</td>
                  <td><code>{tree.branch || "UNAVAILABLE"}</code><span>{tree.head ? tree.head.slice(0, 12) : "HEAD UNAVAILABLE"}</span></td>
                  <td>
                    <StatusBadge value={tree.dirty ? "DIRTY" : "CLEAN"} />
                    <span>{tree.untracked?.length ? `${tree.untracked.length} untracked` : "NO UNTRACKED"}</span>
                  </td>
                  <td>{tree.ownerAgent || "UNASSIGNED"}</td>
                  <td><span>{tree.remote || "NO REMOTE"}</span><small>{tree.prunable == null ? "PRUNE UNKNOWN" : tree.prunable ? "PRUNABLE" : "NOT PRUNABLE"}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      ) : (
        <EmptyState title="No worktree records" detail="No worktree registry entries were derived from the configured ADOS source." />
      )}
    </Panel>
  );
}

function EvidenceBrowser({ snapshot, query, setQuery, status, setStatus }: { snapshot: MissionSnapshot; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void }) {
  const states = [...new Set(snapshot.evidence.map((item) => item.trackedState))];
  const items = snapshot.evidence.filter((item) => (
    (status === "ALL" || item.trackedState === status)
    && `${item.evidenceId} ${item.path} ${item.relatedTaskId || ""} ${item.trustFlags.join(" ")}`.toLowerCase().includes(query.toLowerCase())
  ));
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const verify = async (item: EvidenceItem) => {
    setBusyId(item.evidenceId);
    setVerifyMessage(null);
    try {
      const params = new URLSearchParams({
        path: item.path,
        sha256: item.sha256 || "",
      });
      const response = await fetch(`/api/v1/evidence/verify?${params.toString()}`);
      const payload = await response.json();
      setVerifyMessage(
        response.ok
          ? `${item.evidenceId}: ${payload.status} · ${payload.detail} (contentIngested=${payload.contentIngested})`
          : payload?.error?.message || "Verify request failed",
      );
    } catch (error) {
      setVerifyMessage(error instanceof Error ? error.message : "Verify failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel code="EVIDENCE / TRUST" title="Evidence metadata browser" meta={`${items.length} of ${snapshot.evidence.length}`}>
      <div className="readonly-banner"><FileSearch size={16} /><strong>METADATA ONLY</strong><span>Bodies are never returned. Hash verify recomputes digests under the control-plane root and reports MATCH / MISMATCH / UNAVAILABLE.</span></div>
      {verifyMessage && <div className="source-notice tone-warning" role="status"><strong>HASH VERIFY</strong><span>{verifyMessage}</span></div>}
      <FilterBar query={query} onQuery={setQuery} status={status} onStatus={setStatus} statuses={states} label="Search evidence id, path, or task" />
      {items.length ? (
        <TableFrame label="Scrollable evidence table">
          <table>
            <thead>
              <tr>
                <th>Evidence</th>
                <th>Path</th>
                <th>SHA256 / size</th>
                <th>Tracked / trust</th>
                <th>Related</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: EvidenceItem) => (
                <tr key={item.evidenceId}>
                  <td><code className="full-id">{item.evidenceId}</code><small>{item.creator || "CREATOR UNAVAILABLE"} · {formatTimestamp(item.createdAt, true)}</small></td>
                  <td><span title={item.path}>{compactPath(item.path, 40)}</span></td>
                  <td><code>{item.sha256 ? item.sha256.slice(0, 16) : "HASH UNAVAILABLE"}</code><span>{item.sizeBytes != null ? `${item.sizeBytes} B` : "SIZE UNAVAILABLE"}</span></td>
                  <td><StatusBadge value={item.trackedState} />{item.trustFlags.length ? item.trustFlags.map((flag) => <span key={flag}>{flag}</span>) : <span>NO TRUST FLAGS</span>}</td>
                  <td><span>{item.relatedTaskId || "NO TASK"}</span><small>{item.relatedApprovalId || item.relatedLeaseId || "NO APPROVAL/LEASE"}</small></td>
                  <td>
                    <VerificationBadge value={item.verification} />
                    <button type="button" disabled={busyId === item.evidenceId || !item.sha256} onClick={() => verify(item)}>
                      Verify hash
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      ) : (
        <EmptyState title="No matching evidence" detail="Adjust the evidence search or tracked-state filter." />
      )}
    </Panel>
  );
}

function Safety({ snapshot }: { snapshot: MissionSnapshot }) {
  const severities = ["CRITICAL", "BLOCKED", "ATTENTION", "NOTICE", "NOMINAL"] as const;
  const conflicts = snapshot.conflicts || [];
  return (
    <>
    <Panel code="SENTRY / SAFETY" title="Safety monitor" meta={`${snapshot.alerts.length} active · system ${snapshot.systemHealth.severity}`}>
      <div className="readonly-banner"><Siren size={16} /><strong>OBSERVATION ONLY</strong><span>Mission Control never acknowledges or clears safety alerts.</span></div>
      <div className="detector-legend" aria-label="Severity legend">
        {severities.map((level) => <span key={level} className={`tone-${stateTone(level)}`}>{level}</span>)}
      </div>
      {snapshot.alerts.length ? (
        <div className="alert-list">
          {snapshot.alerts.map((alert) => (
            <div className={`alert-item tone-${stateTone(alert.severity)}`} key={alert.alertId}>
              <AlertTriangle size={17} />
              <div>
                <strong>{alert.code.replaceAll("_", " ")}</strong>
                <span>{alert.message}</span>
              </div>
              <StatusBadge value={alert.severity} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No safety signals" detail="The current read model did not derive an active alert." />
      )}
    </Panel>
    <Panel code="CONFLICT / DETECTORS" title="Conflict detection" meta={`${conflicts.length} inferred`}>
      <div className="readonly-banner"><AlertTriangle size={16} /><strong>INFERRED ONLY</strong><span>Dual-primary, stale-lease, path-conflict, and worktree-drift detectors. Never AUTHORITATIVE.</span></div>
      {conflicts.length ? (
        <div className="incident-grid">
          {conflicts.map((conflict) => (
            <article className="incident-card" key={conflict.conflictId}>
              <header>
                <div><AlertTriangle size={18} /><span>{conflict.kind.replaceAll("_", " ")}</span></div>
                <StatusBadge value={conflict.severity} />
              </header>
              <dl>
                <div><dt>Title</dt><dd>{conflict.title}</dd></div>
                <div><dt>Freshness</dt><dd>{conflict.freshness}</dd></div>
                <div><dt>Owner attention</dt><dd>{conflict.ownerAttentionRequired ? "REQUIRED" : "OPTIONAL"}</dd></div>
              </dl>
              <div className="incident-resolution"><span>DETAIL</span><p>{conflict.detail}</p></div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No conflicts observed" detail="Detectors found no dual-primary, stale-lease, path, or worktree-drift signals." />
      )}
    </Panel>
    </>
  );
}

function budgetLabel(used: number, limit: number): string {
  return `${used} / ${limit || "∞"}`;
}

function CampaignBudgetBurnPanel({ campaigns }: { campaigns: CampaignCard[] }) {
  const panels = campaigns.map((campaign) => buildCampaignBudgetPanel(campaign));
  return (
    <Panel code="CAMPAIGN / BUDGET" title="Budget burn & forecast" meta={`${panels.length} campaign${panels.length === 1 ? "" : "s"}`}>
      <div className="readonly-banner">
        <ShieldCheck size={16} />
        <strong>DERIVED ONLY</strong>
        <span>Burn rate and exhaustion require a valid issuedAt. Missing timestamps report UNAVAILABLE — never invented.</span>
      </div>
      {panels.length ? (
        <div className="budget-panel-stack">
          {panels.map((panel) => (
            <article className="budget-campaign-card" key={panel.campaignId} aria-label={`Budget panel ${panel.campaignId}`}>
              <header>
                <code className="full-id">{panel.campaignId}</code>
                <small>Issued {formatTimestamp(panel.issuedAt, true)}</small>
              </header>
              <div className="budget-lane-grid">
                {panel.lanes.map((lane) => (
                  <div className="budget-lane" key={lane.id}>
                    <div className="budget-lane-head">
                      <strong>{lane.label}</strong>
                      <span>{budgetLabel(lane.used, lane.limit)}</span>
                    </div>
                    <div
                      className="budget-meter"
                      role="meter"
                      aria-label={`${lane.label} utilization`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={lane.utilizationPercent == null ? 0 : Math.round(lane.utilizationPercent)}
                      aria-valuetext={lane.utilizationPercent == null ? "UNAVAILABLE" : `${Math.round(lane.utilizationPercent)} percent`}
                    >
                      <span style={{ width: `${lane.utilizationPercent ?? 0}%` }} />
                    </div>
                    <dl>
                      <div><dt>Remaining</dt><dd>{lane.remainingLabel}</dd></div>
                      <div><dt>Burn</dt><dd>{lane.burnLabel}</dd></div>
                      <div><dt>Forecast exhaust</dt><dd title={lane.forecastExhaustionAt || undefined}>{lane.forecastLabel === "UNAVAILABLE" ? "UNAVAILABLE" : formatTimestamp(lane.forecastExhaustionAt, true)}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No budget panels" detail="No campaign records were available to derive budget burn." />
      )}
    </Panel>
  );
}

function Campaigns({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <>
      <Panel code="CAMPAIGN / AUTONOMY" title="Cursor-first campaigns" meta={`${snapshot.campaigns.length} visible · freshness ${snapshot.freshness}`}>
        <div className="readonly-banner"><ShieldCheck size={16} /><strong>READ-ONLY V2</strong><span>Campaign pause, resume, and kill remain control-plane tools. Mission Control never mutates campaign state.</span></div>
        {snapshot.campaigns.length ? (
          <TableFrame>
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status / runtimes</th>
                  <th>Budgets</th>
                  <th>Push/merge/deploy</th>
                  <th>Owner gates</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.campaigns.map((campaign: CampaignCard) => {
                  const risk = scoreCampaignRisk(campaign);
                  return (
                  <tr key={campaign.campaignId}>
                    <td>
                      <code className="full-id">{campaign.campaignId}</code>
                      <small>{campaign.projectIds.join(", ") || "NO PROJECT IDS"}</small>
                      <VerificationBadge value={campaign.verification} />
                    </td>
                    <td>
                      <StatusBadge value={campaign.status} />
                      <span>{campaign.primaryRuntime} → {campaign.reviewRuntime}</span>
                      <small>Risk {risk.band} ({risk.freshness}{risk.fromControlPlane ? " · control-plane" : " · derived"})</small>
                      <small>{formatTimestamp(campaign.expiresAt, true)}</small>
                    </td>
                    <td>
                      <span>Cursor {budgetLabel(campaign.budgets.cursorLaunches.used, campaign.budgets.cursorLaunches.limit)}</span>
                      <span>Claude {budgetLabel(campaign.budgets.claudeReviews.used, campaign.budgets.claudeReviews.limit)}</span>
                      <span>Remediation {budgetLabel(campaign.budgets.remediations.used, campaign.budgets.remediations.limit)}</span>
                    </td>
                    <td><StatusBadge value={campaign.pushMergeDeployPolicy} /></td>
                    <td>{campaign.ownerOnlyGates.length ? campaign.ownerOnlyGates.map((gate) => <span key={gate}>{gate}</span>) : <span>NONE DECLARED</span>}</td>
                    <td>{campaign.nextAction}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </TableFrame>
        ) : (
          <EmptyState title="No campaign records" detail="No campaign JSON/JSONL was derived from the configured ADOS source. Fixture and unavailable modes report this truthfully." />
        )}
      </Panel>
      <CampaignBudgetBurnPanel campaigns={snapshot.campaigns} />
    </>
  );
}

function OwnerGates({ snapshot }: { snapshot: MissionSnapshot }) {
  const phase2 = snapshot.capabilities?.phase2Commands === true;
  const signingReady = snapshot.capabilities?.ownerSigningConfigured === true;
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [challengeJson, setChallengeJson] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const requestChallenge = async (gateId: string, status: "APPROVED" | "DENIED") => {
    setBusy(gateId);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/owner-gates/${encodeURIComponent(gateId)}/challenge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, selectedOption: selected[gateId] || undefined }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload?.error?.message || "Challenge failed");
        return;
      }
      setChallengeJson((prev) => ({ ...prev, [gateId]: JSON.stringify(payload.challenge, null, 2) }));
      setMessage(`Signing challenge ready for ${gateId}. Sign outside Mission Control, then paste the base64 signature.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Challenge failed");
    } finally {
      setBusy(null);
    }
  };

  const router = useRouter();
  const submitDecision = async (gateId: string) => {
    setBusy(gateId);
    setMessage(null);
    try {
      const challenge = JSON.parse(challengeJson[gateId] || "null");
      const response = await fetch(`/api/v1/owner-gates/${encodeURIComponent(gateId)}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challenge, signature: signature[gateId] }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload?.error?.message || "Decide failed");
      } else {
        setMessage(`Gate ${gateId} closed as ${payload.status}.`);
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Decide failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel code="GATE / OWNER-ONLY" title="Protected owner decisions" meta={`${snapshot.ownerGates.length} visible · freshness ${snapshot.freshness}`}>
      <div className="readonly-banner">
        <ShieldAlert size={16} />
        <strong>{phase2 && signingReady ? "SIGNED OWNER WORKFLOW" : phase2 ? "SIGNING FAIL-CLOSED" : "NO UI ACTION"}</strong>
        <span>
          {phase2 && signingReady
            ? "Challenge → external Ed25519 sign → decide. Agents cannot self-approve. Private keys never enter Mission Control."
            : phase2
              ? "Phase 2 is enabled but MISSION_CONTROL_OWNER_PUBKEY_PATH is missing — gate decisions stay fail-closed."
              : "Approving or denying these gates requires Phase 2 authorization and a pinned owner public key."}
        </span>
      </div>
      {message && <div className="source-notice tone-warning" role="status"><strong>GATE WORKFLOW</strong><span>{message}</span></div>}
      {snapshot.ownerGates.length ? (
        <div className="incident-grid">
          {snapshot.ownerGates.map((gate: OwnerGateCard) => (
            <article className="incident-card" key={gate.gateId}>
              <header>
                <div><ShieldAlert size={18} /><span>{gate.gateId}</span></div>
                <StatusBadge value={gate.status} />
              </header>
              <dl>
                <div><dt>Campaign / mission</dt><dd>{gate.campaignId} · {gate.missionId}</dd></div>
                <div><dt>Decision type</dt><dd>{gate.decisionType.replaceAll("_", " ")}</dd></div>
                <div><dt>Recommended option</dt><dd>{gate.recommendedOption || "NONE"}</dd></div>
                <div><dt>Owner action</dt><dd>{gate.ownerActionRequired ? "REQUIRED" : "NOT CURRENTLY REQUIRED"}</dd></div>
              </dl>
              {gate.status === "OPEN" && phase2 && (
                <div className="owner-gate-workflow">
                  <label>
                    <span className="sr-only">Selected option</span>
                    <select
                      aria-label={`Option for ${gate.gateId}`}
                      value={selected[gate.gateId] || gate.recommendedOption || gate.options[0] || ""}
                      onChange={(event) => setSelected((prev) => ({ ...prev, [gate.gateId]: event.target.value }))}
                    >
                      {gate.options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  <div className="approval-actions-preview">
                    <button type="button" disabled={!signingReady || busy === gate.gateId} onClick={() => requestChallenge(gate.gateId, "APPROVED")}>Challenge approve</button>
                    <button type="button" disabled={!signingReady || busy === gate.gateId} onClick={() => requestChallenge(gate.gateId, "DENIED")}>Challenge deny</button>
                  </div>
                  {challengeJson[gate.gateId] && (
                    <>
                      <label className="search-field">
                        <span className="sr-only">Challenge JSON</span>
                        <textarea aria-label={`Challenge for ${gate.gateId}`} value={challengeJson[gate.gateId]} readOnly rows={6} />
                      </label>
                      <label className="search-field">
                        <span className="sr-only">Signature</span>
                        <input
                          aria-label={`Signature for ${gate.gateId}`}
                          placeholder="Base64 Ed25519 signature"
                          value={signature[gate.gateId] || ""}
                          onChange={(event) => setSignature((prev) => ({ ...prev, [gate.gateId]: event.target.value }))}
                          autoComplete="off"
                        />
                      </label>
                      <button type="button" disabled={!signingReady || busy === gate.gateId || !signature[gate.gateId]} onClick={() => submitDecision(gate.gateId)}>
                        Submit signed decision
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="incident-resolution">
                <span>SUMMARY</span>
                <p>{gate.summary}</p>
              </div>
              <div className="record-list">
                {gate.options.map((option) => <div className="record-row" key={option}><div className="record-dot tone-neutral" /><div><strong>{option.replaceAll("_", " ")}</strong></div></div>)}
              </div>
              <VerificationBadge value={gate.verification} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No owner-gate records" detail="No open or historical owner-gate packets were derived from state/owner-gates.jsonl or handoffs/owner/inbox." />
      )}
    </Panel>
  );
}

function Replay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [campaignId, setCampaignId] = useState(() => searchParams.get("campaignId") || "");
  const [runId, setRunId] = useState(() => searchParams.get("runId") || "");
  const [projection, setProjection] = useState<ReplayProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const requestedCampaignId = searchParams.get("campaignId")?.trim() || "";
  const requestedRunId = searchParams.get("runId")?.trim() || "";

  useEffect(() => {
    setCampaignId(requestedCampaignId);
    setRunId(requestedRunId);
    if (!requestedCampaignId || !requestedRunId) {
      setProjection(null);
      setFetchError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    void fetch(
      `/api/v1/replay?campaignId=${encodeURIComponent(requestedCampaignId)}&runId=${encodeURIComponent(requestedRunId)}`,
    )
      .then(async (response) => {
        const body = (await response.json()) as ReplayProjection;
        if (cancelled) return;
        setProjection(body);
        if (!response.ok && body.freshness !== "UNAVAILABLE") {
          setFetchError(`Replay request failed with HTTP ${response.status}.`);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setProjection(null);
        setFetchError(error instanceof Error ? error.message : "Replay request failed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestedCampaignId, requestedRunId]);

  const openReplay = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (campaignId.trim()) params.set("campaignId", campaignId.trim());
    if (runId.trim()) params.set("runId", runId.trim());
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const freshness = projection?.freshness;
  const events = projection?.events ?? [];

  return (
    <Panel
      code="REPLAY / EVIDENCE"
      title="Supervisor run chronology"
      meta={
        requestedCampaignId && requestedRunId
          ? `${events.length} event${events.length === 1 ? "" : "s"} · freshness ${freshness || "PENDING"}`
          : "awaiting campaignId + runId"
      }
    >
      <div className="readonly-banner">
        <History size={16} />
        <strong>GET-ONLY REPLAY</strong>
        <span>Reads evidence/supervisor-runs under the configured control-plane root. Secrets are redacted before display. Mission Control never mutates run evidence.</span>
      </div>

      <form className="replay-form" onSubmit={openReplay}>
        <label className="search-field">
          <Flag size={16} />
          <span className="sr-only">Campaign ID</span>
          <input
            aria-label="Campaign ID"
            name="campaignId"
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            placeholder="campaignId"
            autoComplete="off"
          />
        </label>
        <label className="search-field">
          <TerminalSquare size={16} />
          <span className="sr-only">Run ID</span>
          <input
            aria-label="Run ID"
            name="runId"
            value={runId}
            onChange={(event) => setRunId(event.target.value)}
            placeholder="runId"
            autoComplete="off"
          />
        </label>
        <button type="submit" className="replay-submit">Open replay</button>
      </form>

      {loading && <EmptyState title="Loading replay" detail="Fetching redacted supervisor-run chronology…" />}
      {!loading && fetchError && <EmptyState title="Replay request failed" detail={fetchError} />}
      {!loading && !fetchError && !requestedCampaignId && (
        <EmptyState
          title="No run selected"
          detail="Enter a campaignId and runId to open a GET-only chronological replay. Example fixture: campaign-replay-001 / run-replay-001."
        />
      )}
      {!loading && !fetchError && requestedCampaignId && !requestedRunId && (
        <EmptyState title="Run ID required" detail="Both campaignId and runId are required. Missing identifiers never invent a timeline." />
      )}
      {!loading && !fetchError && projection && freshness === "UNAVAILABLE" && (
        <EmptyState
          title="Replay unavailable"
          detail={projection.warnings[0] || "No supervisor-run evidence directory was found for the requested identifiers."}
        />
      )}
      {!loading && !fetchError && projection && freshness !== "UNAVAILABLE" && (
        <>
          <div className="replay-meta">
            <div><span>CAMPAIGN</span><strong>{projection.campaignId}</strong></div>
            <div><span>RUN</span><strong>{projection.runId}</strong></div>
            <div><span>FRESHNESS</span><strong><FreshnessBadge value={projection.freshness} /></strong></div>
            <div><span>EVENTS</span><strong>{events.length}</strong></div>
          </div>
          {projection.warnings.length > 0 && (
            <div className="source-notice tone-warning" role="status">
              <AlertTriangle size={18} />
              <div>
                <strong>REPLAY WARNINGS</strong>
                <span>{projection.warnings[0]}</span>
              </div>
              <StatusBadge value="WARNING" />
            </div>
          )}
          {events.length ? (
            <div className="timeline-list">
              {events.map((entry: ReplayEvent, index) => (
                <article className="timeline-entry" key={`${entry.sequence}-${entry.timestamp}-${index}`}>
                  <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
                  <span className={`timeline-node tone-${stateTone(entry.severity)}`} />
                  <div>
                    <div className="timeline-kicker">
                      <b>{entry.actor}</b>
                      <StatusBadge value={entry.severity} />
                      <VerificationBadge value={entry.verification} />
                    </div>
                    <h2>{entry.eventType.replaceAll("_", " ")}</h2>
                    <p>{entry.summary}</p>
                    <small>seq {entry.sequence}{entry.taskId ? ` · task ${entry.taskId}` : ""}{entry.evidenceRef ? ` · ${compactPath(entry.evidenceRef, 48)}` : ""}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No replay events" detail="The run directory exists but no supervisor/cursor/claude event streams were derived." />
          )}
        </>
      )}
    </Panel>
  );
}

function EvidenceDiff() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [campaignId, setCampaignId] = useState(() => searchParams.get("campaignId") || "");
  const [leftRunId, setLeftRunId] = useState(() => searchParams.get("leftRunId") || "");
  const [rightRunId, setRightRunId] = useState(() => searchParams.get("rightRunId") || "");
  const [projection, setProjection] = useState<EvidenceDiffProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const requestedCampaignId = searchParams.get("campaignId")?.trim() || "";
  const requestedLeftRunId = searchParams.get("leftRunId")?.trim() || "";
  const requestedRightRunId = searchParams.get("rightRunId")?.trim() || "";

  useEffect(() => {
    setCampaignId(requestedCampaignId);
    setLeftRunId(requestedLeftRunId);
    setRightRunId(requestedRightRunId);
    if (!requestedCampaignId || !requestedLeftRunId || !requestedRightRunId) {
      setProjection(null);
      setFetchError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    void fetch(
      `/api/v1/evidence-diff?campaignId=${encodeURIComponent(requestedCampaignId)}&leftRunId=${encodeURIComponent(requestedLeftRunId)}&rightRunId=${encodeURIComponent(requestedRightRunId)}`,
    )
      .then(async (response) => {
        const body = (await response.json()) as EvidenceDiffProjection;
        if (cancelled) return;
        setProjection(body);
        if (!response.ok && body.freshness === "UNAVAILABLE") {
          setFetchError(null);
        } else if (!response.ok) {
          setFetchError(`Evidence diff request failed with HTTP ${response.status}.`);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setProjection(null);
        setFetchError(error instanceof Error ? error.message : "Evidence diff request failed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestedCampaignId, requestedLeftRunId, requestedRightRunId]);

  const openDiff = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (campaignId.trim()) params.set("campaignId", campaignId.trim());
    if (leftRunId.trim()) params.set("leftRunId", leftRunId.trim());
    if (rightRunId.trim()) params.set("rightRunId", rightRunId.trim());
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const ready = Boolean(requestedCampaignId && requestedLeftRunId && requestedRightRunId);
  const visibleEntries = (projection?.entries || []).filter((entry) => entry.kind !== "unchanged");

  return (
    <Panel
      code="DIFF / EVIDENCE"
      title="Supervisor run comparison"
      meta={
        ready
          ? `${projection?.summary.added ?? 0} added · ${projection?.summary.removed ?? 0} removed · ${projection?.summary.changed ?? 0} changed · freshness ${projection?.freshness || "PENDING"}`
          : "awaiting campaignId + leftRunId + rightRunId"
      }
    >
      <div className="readonly-banner">
        <FileDiff size={16} />
        <strong>GET-ONLY DIFF</strong>
        <span>Compares redacted supervisor-run chronologies. Missing runs report UNAVAILABLE — Mission Control never fabricates events.</span>
      </div>

      <form className="replay-form evidence-diff-form" onSubmit={openDiff}>
        <label className="search-field">
          <Flag size={16} />
          <span className="sr-only">Campaign ID</span>
          <input aria-label="Campaign ID" value={campaignId} onChange={(event) => setCampaignId(event.target.value)} placeholder="campaignId" autoComplete="off" />
        </label>
        <label className="search-field">
          <TerminalSquare size={16} />
          <span className="sr-only">Left run ID</span>
          <input aria-label="Left run ID" value={leftRunId} onChange={(event) => setLeftRunId(event.target.value)} placeholder="leftRunId" autoComplete="off" />
        </label>
        <label className="search-field">
          <TerminalSquare size={16} />
          <span className="sr-only">Right run ID</span>
          <input aria-label="Right run ID" value={rightRunId} onChange={(event) => setRightRunId(event.target.value)} placeholder="rightRunId" autoComplete="off" />
        </label>
        <button type="submit" className="replay-submit">Compare runs</button>
      </form>

      {loading && <EmptyState title="Loading evidence diff" detail="Fetching redacted left/right supervisor-run chronologies…" />}
      {fetchError && <EmptyState title="Evidence diff failed" detail={fetchError} />}
      {!loading && !fetchError && !ready && (
        <EmptyState
          title="No comparison selected"
          detail="Enter a campaignId plus left and right runIds. Fixture example: campaign-replay-001 / run-replay-001 / run-replay-002."
        />
      )}
      {!loading && !fetchError && projection && projection.freshness === "UNAVAILABLE" && (
        <EmptyState title="Evidence diff unavailable" detail={projection.warnings[0] || "Both runs are unavailable under the configured control-plane root."} />
      )}
      {!loading && !fetchError && projection && projection.freshness !== "UNAVAILABLE" && (
        <>
          <div className="replay-meta">
            <div><span>CAMPAIGN</span><strong>{projection.campaignId}</strong></div>
            <div><span>LEFT</span><strong>{projection.leftRunId} · {projection.left.freshness}</strong></div>
            <div><span>RIGHT</span><strong>{projection.rightRunId} · {projection.right.freshness}</strong></div>
            <div><span>UNCHANGED</span><strong>{projection.summary.unchanged}</strong></div>
          </div>
          {projection.warnings.length > 0 && (
            <div className="source-notice tone-warning" role="status">
              <AlertTriangle size={18} />
              <div>
                <strong>DIFF WARNINGS</strong>
                <span>{projection.warnings[0]}</span>
              </div>
              <StatusBadge value="WARNING" />
            </div>
          )}
          {visibleEntries.length ? (
            <div className="evidence-diff-list" aria-label="Evidence diff entries">
              {visibleEntries.map((entry) => (
                <article className={`evidence-diff-entry kind-${entry.kind}`} key={`${entry.kind}-${entry.key}`}>
                  <header>
                    <StatusBadge value={entry.kind.toUpperCase()} />
                    <code>{entry.key}</code>
                    {entry.changes?.length ? <small>{entry.changes.join(", ")}</small> : null}
                  </header>
                  <div className="evidence-diff-columns">
                    <div>
                      <span>Left</span>
                      {entry.left ? (
                        <>
                          <strong>{entry.left.eventType}</strong>
                          <p>{entry.left.summary}</p>
                        </>
                      ) : (
                        <p>ABSENT</p>
                      )}
                    </div>
                    <div>
                      <span>Right</span>
                      {entry.right ? (
                        <>
                          <strong>{entry.right.eventType}</strong>
                          <p>{entry.right.summary}</p>
                        </>
                      ) : (
                        <p>ABSENT</p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No added, removed, or changed events"
              detail={
                projection.left.freshness === "UNAVAILABLE" || projection.right.freshness === "UNAVAILABLE"
                  ? "One side is UNAVAILABLE, so no structural diff entries were emitted."
                  : "Both runs are available and event keys match without field changes (unchanged events are hidden)."
              }
            />
          )}
        </>
      )}
    </Panel>
  );
}

export function MissionControl({ initialSnapshot, view }: { initialSnapshot: MissionSnapshot; view: DashboardView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [streamState, setStreamState] = useState<"CONNECTING" | "LIVE" | "DISCONNECTED" | "DEGRADED">("CONNECTING");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [status, setStatus] = useState(() => searchParams.get("status") || "ALL");

  useEffect(() => {
    const saved = window.localStorage.getItem("mission-control-theme");
    const nextTheme = saved === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    let disposed = false;
    let stream: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (disposed) return;
      stream?.close();
      setStreamState("CONNECTING");
      stream = new EventSource("/api/v1/events/stream");
      stream.onopen = () => {
        if (!disposed) setStreamState("LIVE");
      };
      stream.addEventListener("snapshot", (event) => {
        if (disposed) return;
        try {
          setSnapshot(JSON.parse((event as MessageEvent<string>).data) as MissionSnapshot);
          setStreamState("LIVE");
        } catch {
          setStreamState("DEGRADED");
        }
      });
      stream.addEventListener("broker-error", () => {
        if (!disposed) setStreamState("DEGRADED");
      });
      stream.onerror = () => {
        if (disposed) return;
        setStreamState("DISCONNECTED");
        stream?.close();
        reconnectTimer = setTimeout(connect, 2_000);
      };
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      stream?.close();
    };
  }, []);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setStatus(searchParams.get("status") || "ALL");
  }, [view, searchParams]);

  useEffect(() => {
    if (!["tasks", "approvals", "timeline", "handoffs", "evidence"].includes(view)) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status && status !== "ALL") params.set("status", status);
    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [query, status, pathname, router, searchParams, view]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("mission-control-theme", nextTheme);
  };
  const displayFreshness = freshnessFromSnapshot(snapshot, streamState === "LIVE");
  const copy = viewCopy[view];
  const body = useMemo(() => {
    if (view === "overview") return <Overview snapshot={snapshot} />;
    if (view === "projects") return <Projects snapshot={snapshot} />;
    if (view === "agents") return <Agents snapshot={snapshot} />;
    if (view === "tasks") return <Tasks snapshot={snapshot} query={query} setQuery={setQuery} status={status} setStatus={setStatus} />;
    if (view === "approvals") return <Approvals snapshot={snapshot} query={query} setQuery={setQuery} status={status} setStatus={setStatus} />;
    if (view === "campaigns") return <Campaigns snapshot={snapshot} />;
    if (view === "owner-gates") return <OwnerGates snapshot={snapshot} />;
    if (view === "workflow") return <Workflow snapshot={snapshot} />;
    if (view === "handoffs") return <Handoffs snapshot={snapshot} query={query} setQuery={setQuery} status={status} setStatus={setStatus} />;
    if (view === "worktrees") return <Worktrees snapshot={snapshot} />;
    if (view === "evidence") return <EvidenceBrowser snapshot={snapshot} query={query} setQuery={setQuery} status={status} setStatus={setStatus} />;
    if (view === "safety") return <Safety snapshot={snapshot} />;
    if (view === "timeline") return <Timeline snapshot={snapshot} query={query} setQuery={setQuery} status={status} setStatus={setStatus} />;
    if (view === "dead-letter") return <DeadLetter snapshot={snapshot} />;
    if (view === "operations") return <Operations snapshot={snapshot} />;
    if (view === "fleet") return <Fleet snapshot={snapshot} />;
    if (view === "replay") return <Replay />;
    if (view === "evidence-diff") return <EvidenceDiff />;
    return <RoutingIncidents snapshot={snapshot} />;
  }, [view, snapshot, query, status]);

  const cockpitMode = snapshot.source.mode === "LIVE" ? "LIVE" : snapshot.source.mode === "FIXTURE" ? "MOCK/FIXTURE" : String(snapshot.source.mode || "UNKNOWN");
  const heartbeatLabel = (snapshot.primaryLease.heartbeatFreshness || "unknown").toUpperCase();

  return (
    <div className="mission-shell">
      <div className="cockpit-identity-banner" role="banner" aria-label="Cockpit identity">
        <strong>COCKPIT:</strong> ados-mission-control v2 (live broker) · <strong>MODE:</strong> {cockpitMode} · <strong>MUTATION:</strong> READ-ONLY · <strong>HEARTBEAT:</strong> {heartbeatLabel}
        {snapshot.primaryLease.heartbeatAgeSeconds != null ? ` (${snapshot.primaryLease.heartbeatAgeSeconds}s)` : " (age unavailable)"}
        {" · "}Not the foundation mock at agent-development-os-mission-control
      </div>
      <aside className="command-rail">
        <Link className="brand-mark" href="/overview" aria-label="Mission Control overview"><Hexagon size={34} /><span>MC</span></Link>
        <div className="brand-copy"><strong>THE BLACK AGENCY</strong><span>ADOS MISSION CONTROL</span></div>
        <nav aria-label="Mission Control navigation">{navigation.map(({ view: itemView, label, icon: Icon }) => <Link href={`/${itemView}`} key={itemView} aria-current={view === itemView ? "page" : undefined} className={view === itemView ? "active" : ""}><Icon size={17} /><span>{label}</span></Link>)}</nav>
        <div className="rail-status"><div><Radio size={14} /><span>DATA SOURCE</span><strong>{snapshot.source.mode}</strong></div><div><ShieldCheck size={14} /><span>AUTHORITY</span><strong>READ ONLY</strong></div></div>
      </aside>

      <div className="mission-main">
        <header className="topbar">
          <div className="mobile-brand"><Hexagon size={23} /><strong>MC / ADOS</strong></div>
          <div className={`data-link tone-${stateTone(streamState)}`}><CircleDot size={13} /><span>DATA LINK</span><strong>{streamState}</strong></div>
          <div className="topbar-meta"><div><span>FRESHNESS</span><strong><FreshnessBadge value={displayFreshness} /></strong></div><div><span>SOURCE</span><strong>{snapshot.readModel.recoveredFromCache ? "STALE" : snapshot.source.reachable ? "REACHABLE" : "UNAVAILABLE"}</strong></div><div><span>CACHE</span><strong>{snapshot.readModel.status}</strong></div><div><span>WARNINGS</span><strong>{snapshot.source.parsingWarningCount}</strong></div><div><span>REFRESH</span><strong>{formatTimestamp(snapshot.source.lastSuccessfulRefresh, true)}</strong></div></div>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
        </header>

        <nav className="mobile-nav" aria-label="Mobile Mission Control navigation">{navigation.map(({ view: itemView, label, icon: Icon }) => <Link href={`/${itemView}`} key={itemView} aria-label={label} aria-current={view === itemView ? "page" : undefined} className={view === itemView ? "active" : ""}><Icon size={16} /><span>{label}</span></Link>)}</nav>

        <main className="content" id="main-content">
          <header className="page-heading"><div><span>{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.description}</p></div><div className={`readiness-chip tone-${stateTone(snapshot.systemHealth.readiness)}`}><Activity size={17} /><span>READINESS</span><strong>{snapshot.systemHealth.readiness.replaceAll("_", " ")}</strong></div></header>

          {(snapshot.source.mode !== "LIVE" || snapshot.source.parsingWarningCount > 0 || snapshot.source.stale) && <div className={`source-notice tone-${snapshot.readModel.recoveredFromCache || snapshot.source.reachable ? "warning" : "critical"}`} role="status"><Network size={18} /><div><strong>{snapshot.readModel.recoveredFromCache ? "STALE CACHED SNAPSHOT" : snapshot.source.mode === "FIXTURE" ? "NON-AUTHORITATIVE FIXTURE" : snapshot.source.reachable ? "PARTIAL SOURCE WARNINGS" : "ADOS SOURCE UNAVAILABLE"}</strong><span>{snapshot.source.warnings[0] || "Some malformed records were isolated; unaffected records remain visible."}</span></div><StatusBadge value={snapshot.readModel.recoveredFromCache ? "STALE" : snapshot.source.mode} /></div>}
          {body}
        </main>

        <footer className="application-footer">
          <span><ShieldCheck size={14} /> Mission Control V2 provides authenticated, resilient visibility.</span>
          <span>
            {snapshot.capabilities?.phase6Commands
              ? "Phase 6 controlled ops enabled (validate/integration/review-pickup, approved-only). Cursor cannot take PRIMARY lease here."
              : snapshot.capabilities?.fleetMode
                ? "Phase 4 fleet observation enabled (non-authoritative). Metrics at /api/v1/metrics never imply PRIMARY authority."
                : snapshot.capabilities?.phase3Commands
                  ? "Phase 3 controlled operations enabled (approved-only). Cursor cannot take PRIMARY lease here."
                  : snapshot.capabilities?.phase2Commands
                    ? "Phase 2 owner commands are enabled via allowlisted ADOS tools. Enable Phase 3 separately for dispatch."
                    : "It does not authorize, approve, dispatch, or mutate ADOS operations."}
          </span>
          <a className="support-bundle-link" href="/api/v1/support-bundle" download>
            Download support bundle
          </a>
        </footer>
      </div>
    </div>
  );
}
