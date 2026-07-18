"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Bot,
  Boxes,
  ChevronRight,
  CircleDot,
  FileCheck2,
  Fingerprint,
  Flag,
  Gauge,
  Hexagon,
  ListFilter,
  Moon,
  Network,
  Radio,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sun,
  TerminalSquare,
  Waypoints,
} from "lucide-react";
import type {
  ApprovalCard,
  AuditEntry,
  CampaignCard,
  FreshnessLabel,
  MissionSnapshot,
  OwnerGateCard,
  VerificationLabel,
} from "@/lib/contracts";
import { freshnessFromSnapshot } from "@/lib/data-quality";

export const dashboardViews = [
  "overview",
  "projects",
  "agents",
  "tasks",
  "approvals",
  "campaigns",
  "owner-gates",
  "timeline",
  "routing-incidents",
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
  { view: "timeline", label: "Evidence & audit", icon: Activity },
  { view: "routing-incidents", label: "Routing incidents", icon: Waypoints },
];

const viewCopy: Record<DashboardView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "Command surface / 01", title: "Operational overview", description: "The authoritative state of projects, agents, owner gates, blockers, and recent execution evidence." },
  projects: { eyebrow: "Repository registry / 02", title: "Projects", description: "Canonical repositories, control-plane boundaries, integration worktrees, and next permitted actions." },
  agents: { eyebrow: "Runtime registry / 03", title: "Agents & runtimes", description: "Availability, verification, authority, last execution, and promotion state without runtime mutation controls." },
  tasks: { eyebrow: "Execution ledger / 04", title: "Tasks & executions", description: "Task contracts reconciled with results, protocol state, approvals, evidence, and bounded next actions." },
  approvals: { eyebrow: "Owner gate / 05", title: "Approvals", description: "Filed status, authoritative disposition, consumption, expiry, scope, and current owner-action requirements." },
  campaigns: { eyebrow: "Autonomy campaign / 06", title: "Campaigns", description: "Cursor-first campaign status, budgets, runtimes, and push/merge/deploy policy — observation only." },
  "owner-gates": { eyebrow: "Protected decision / 07", title: "Owner gates", description: "Open and historical owner-only decisions. Mission Control cannot approve, deny, or clear these gates." },
  timeline: { eyebrow: "Trust timeline / 08", title: "Evidence & audit timeline", description: "A filterable chronology separating authoritative results, direct verification, reported claims, and diagnostics." },
  "routing-incidents": { eyebrow: "Containment register / 09", title: "Routing incidents", description: "Cross-project mistakes, repository containment, owner disposition, and recorded resolution." },
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

function TableFrame({ children }: { children: ReactNode }) {
  return <div className="table-frame">{children}</div>;
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
          <div className="lease-card"><div className="lease-orbit"><ShieldCheck size={27} /></div><span>ACTIVE ORCHESTRATOR</span><strong>{snapshot.primaryLease.orchestrator}</strong><StatusBadge value={snapshot.primaryLease.state} /><dl><div><dt>Lease</dt><dd title={snapshot.primaryLease.leaseId}>{compactPath(snapshot.primaryLease.leaseId, 24)}</dd></div><div><dt>Heartbeat</dt><dd>{formatTimestamp(snapshot.primaryLease.heartbeatAt, true)}</dd></div><div><dt>Host process</dt><dd>{snapshot.primaryLease.processLiveness?.alive === true ? "OBSERVED ALIVE" : snapshot.primaryLease.processLiveness?.alive === false ? "NOT OBSERVED" : "NOT OBSERVABLE"}</dd></div></dl></div>
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
  return (
    <div className="card-grid">
      {snapshot.agents.map((agent) => <article className={`agent-card tone-${stateTone(agent.availabilityState)}`} key={agent.agentId}>
        <header><div className="agent-glyph"><Bot size={22} /></div><div><span>{agent.role}</span><h2>{agent.displayName}</h2></div><StatusBadge value={agent.availabilityState} /></header>
        <div className="agent-authority"><Fingerprint size={15} /><span>{agent.authority}</span><VerificationBadge value={agent.verificationState} /></div>
        <dl><div><dt>Runtime status</dt><dd>{agent.status.replaceAll("_", " ")}</dd></div><div><dt>Current task</dt><dd>{agent.currentTask || "NO CURRENT TASK"}</dd></div><div><dt>Last execution</dt><dd>{formatTimestamp(agent.lastExecution, true)}</dd></div><div><dt>Result</dt><dd>{agent.executionResult || "NOT REPORTED"}</dd></div><div><dt>Evidence</dt><dd title={agent.evidenceReference || undefined}>{compactPath(agent.evidenceReference, 34)}</dd></div><div><dt>Promotion</dt><dd>{agent.runtimePromotionPending ? "PENDING — NO UI ACTION" : "NOT PENDING"}</dd></div></dl>
        {agent.blockers.length > 0 && <div className="agent-blocker"><ShieldAlert size={15} />{agent.blockers[0]}</div>}
        <footer><span>{agent.cannotAcquireOrchestratorLease ? "LEASE ACQUISITION PROHIBITED" : "PRIMARY LEASE HOLDER"}</span></footer>
      </article>)}
      {!snapshot.agents.length && <EmptyState title="Runtime registry unavailable" detail="No agent sessions were derived from the configured source." />}
    </div>
  );
}

function Tasks({ snapshot, query, setQuery, status, setStatus }: { snapshot: MissionSnapshot; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void }) {
  const statuses = [...new Set(snapshot.tasks.map((task) => task.status))];
  const items = snapshot.tasks.filter((task) => (status === "ALL" || task.status === status) && `${task.taskId} ${task.project} ${task.owner} ${task.objective}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Panel code="MISSION / QUEUE" title="Task contracts & executions" meta={`${items.length} of ${snapshot.tasks.length}`}>
      <FilterBar query={query} onQuery={setQuery} status={status} onStatus={setStatus} statuses={statuses} label="Search task, project, agent, or objective" />
      {items.length ? <TableFrame><table><thead><tr><th>Task / project</th><th>Agent / status</th><th>Approval / launches</th><th>Protocol / result</th><th>Evidence</th><th>Next permitted action</th></tr></thead><tbody>{items.map((task) => <tr key={task.taskId}><td><strong>{task.taskId}</strong><span>{task.project}</span><small>{task.objective}</small></td><td><strong>{task.owner}</strong><StatusBadge value={task.status} /><small>{task.role || "ROLE UNVERIFIED"}</small></td><td><code>{task.approvalRef || "NO APPROVAL REF"}</code><span>{task.launchCount} launch{task.launchCount === 1 ? "" : "es"}</span><small>{formatTimestamp(task.startedAt, true)} → {formatTimestamp(task.completedAt, true)}</small></td><td><strong>{task.protocolStatus.replaceAll("_", " ")}</strong><span>{task.exitResult || "NOT REPORTED"}</span><VerificationBadge value={task.verification} /></td><td>{task.evidencePaths.length ? task.evidencePaths.map((item) => <code key={item} title={item}>{compactPath(item, 30)}</code>) : <span>UNAVAILABLE</span>}</td><td>{task.nextPermittedAction}</td></tr>)}</tbody></table></TableFrame> : <EmptyState title="No matching tasks" detail="Adjust the task search or status filter." />}
    </Panel>
  );
}

function Approvals({ snapshot, query, setQuery, status, setStatus }: { snapshot: MissionSnapshot; query: string; setQuery: (value: string) => void; status: string; setStatus: (value: string) => void }) {
  const statuses = [...new Set(snapshot.approvals.map((approval) => approval.status))];
  const items = snapshot.approvals.filter((approval) => (status === "ALL" || approval.status === status) && `${approval.approvalId} ${approval.action} ${approval.scopeSummary}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Panel code="GATE / OWNER" title="Approval reconciliation" meta={`${items.length} of ${snapshot.approvals.length}`}>
      <div className="readonly-banner"><ShieldCheck size={16} /><strong>READ-ONLY V1</strong><span>No approval action is enabled. File status and authoritative disposition are intentionally shown separately.</span></div>
      <FilterBar query={query} onQuery={setQuery} status={status} onStatus={setStatus} statuses={statuses} label="Search approval ID, action, or scope" />
      {items.length ? <TableFrame><table><thead><tr><th>Approval / action</th><th>Filed vs authoritative</th><th>Effective state</th><th>Issue / expiry</th><th>Consumption</th><th>Scope / owner action</th></tr></thead><tbody>{items.map((approval: ApprovalCard) => <tr key={approval.approvalId}><td><code className="full-id">{approval.approvalId}</code><strong>{approval.action.replaceAll("_", " ")}</strong></td><td><span>Filed · {approval.fileStatus}</span><strong>Ledger · {approval.authoritativeDisposition}</strong></td><td><StatusBadge value={approval.status} /><small>{approval.riskLevel || "RISK UNRATED"}</small></td><td><span>{formatTimestamp(approval.issuedAt)}</span><small>{formatTimestamp(approval.expiresAt)}</small></td><td><strong>{approval.consumed ? "CONSUMED" : "UNCONSUMED"}</strong><span>{approval.consumptionCount} / {approval.executionLimit ?? "∞"}</span></td><td><span>{approval.scopeSummary}</span>{approval.ownerActionRequired ? <StatusBadge value="OWNER ACTION REQUIRED" /> : <small>NO CURRENT OWNER ACTION</small>}</td></tr>)}</tbody></table></TableFrame> : <EmptyState title="No matching approvals" detail="Adjust the approval search or state filter." />}
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

function budgetLabel(used: number, limit: number): string {
  return `${used} / ${limit || "∞"}`;
}

function Campaigns({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
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
              {snapshot.campaigns.map((campaign: CampaignCard) => (
                <tr key={campaign.campaignId}>
                  <td>
                    <code className="full-id">{campaign.campaignId}</code>
                    <small>{campaign.projectIds.join(", ") || "NO PROJECT IDS"}</small>
                    <VerificationBadge value={campaign.verification} />
                  </td>
                  <td>
                    <StatusBadge value={campaign.status} />
                    <span>{campaign.primaryRuntime} → {campaign.reviewRuntime}</span>
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
              ))}
            </tbody>
          </table>
        </TableFrame>
      ) : (
        <EmptyState title="No campaign records" detail="No campaign JSON/JSONL was derived from the configured ADOS source. Fixture and unavailable modes report this truthfully." />
      )}
    </Panel>
  );
}

function OwnerGates({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <Panel code="GATE / OWNER-ONLY" title="Protected owner decisions" meta={`${snapshot.ownerGates.length} visible · freshness ${snapshot.freshness}`}>
      <div className="readonly-banner"><ShieldAlert size={16} /><strong>NO UI ACTION</strong><span>Approving or denying these gates requires control-plane owner tools. Agents cannot self-approve.</span></div>
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

export function MissionControl({ initialSnapshot, view }: { initialSnapshot: MissionSnapshot; view: DashboardView }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [streamState, setStreamState] = useState<"CONNECTING" | "LIVE" | "DISCONNECTED" | "DEGRADED">("CONNECTING");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    const saved = window.localStorage.getItem("mission-control-theme");
    const nextTheme = saved === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    const stream = new EventSource("/api/v1/events/stream");
    stream.onopen = () => setStreamState("LIVE");
    stream.addEventListener("snapshot", (event) => {
      try {
        setSnapshot(JSON.parse((event as MessageEvent<string>).data) as MissionSnapshot);
        setStreamState("LIVE");
      } catch {
        setStreamState("DEGRADED");
      }
    });
    stream.addEventListener("broker-error", () => setStreamState("DEGRADED"));
    stream.onerror = () => setStreamState("DISCONNECTED");
    return () => stream.close();
  }, []);

  useEffect(() => { setQuery(""); setStatus("ALL"); }, [view]);

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
    if (view === "timeline") return <Timeline snapshot={snapshot} query={query} setQuery={setQuery} status={status} setStatus={setStatus} />;
    return <RoutingIncidents snapshot={snapshot} />;
  }, [view, snapshot, query, status]);

  return (
    <div className="mission-shell">
      <aside className="command-rail" aria-label="Mission Control navigation">
        <Link className="brand-mark" href="/overview" aria-label="Mission Control overview"><Hexagon size={34} /><span>MC</span></Link>
        <div className="brand-copy"><strong>THE BLACK AGENCY</strong><span>ADOS MISSION CONTROL</span></div>
        <nav>{navigation.map(({ view: itemView, label, icon: Icon }) => <Link href={`/${itemView}`} key={itemView} aria-current={view === itemView ? "page" : undefined} className={view === itemView ? "active" : ""}><Icon size={17} /><span>{label}</span></Link>)}</nav>
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

        <footer className="application-footer"><span><ShieldCheck size={14} /> Mission Control V2 provides authenticated, resilient visibility.</span><span>It does not authorize, approve, dispatch, or mutate ADOS operations.</span></footer>
      </div>
    </div>
  );
}
