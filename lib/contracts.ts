export type Authority = "AUTHORITATIVE" | "NON_AUTHORITATIVE" | "OBSERVED";
export type Severity = "INFO" | "SUCCESS" | "WARNING" | "BLOCKED" | "CRITICAL";
export type SourceMode = "LIVE" | "FIXTURE" | "UNAVAILABLE";
export type FreshnessLabel =
  | "LIVE"
  | "CACHED"
  | "MOCK"
  | "STALE"
  | "INFERRED"
  | "AUTHORITATIVE"
  | "UNAVAILABLE";
export type VerificationLabel =
  | "VERIFIED_DIRECTLY"
  | "REPORTED_NOT_REVERIFIED"
  | "DIAGNOSTIC_ONLY"
  | "UNVERIFIED"
  | "CONTRADICTED"
  | "AUTHORITATIVE";
export type NormalizedState =
  | "PENDING"
  | "APPROVED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED"
  | "EXPIRED"
  | "REVOKED"
  | "CONSUMED"
  | "SUPERSEDED"
  | "DENIED"
  | "UNKNOWN";

export interface CampaignBudgetSnapshot {
  cursorLaunches: { used: number; limit: number };
  claudeReviews: { used: number; limit: number };
  remediations: { used: number; limit: number };
}

export interface CampaignCard {
  campaignId: string;
  status: string;
  primaryRuntime: string;
  reviewRuntime: string;
  projectIds: string[];
  issuedAt?: string | null;
  expiresAt?: string | null;
  ownerApprovalRef?: string | null;
  budgets: CampaignBudgetSnapshot;
  ownerOnlyGates: string[];
  pushMergeDeployPolicy: string;
  nextAction: string;
  verification: VerificationLabel;
  authority: Authority;
}

export interface OwnerGateCard {
  gateId: string;
  campaignId: string;
  missionId: string;
  decisionType: string;
  summary: string;
  status: string;
  options: string[];
  recommendedOption?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  ownerActionRequired: boolean;
  verification: VerificationLabel;
  authority: Authority;
}

export interface SystemHealth {
  severity: Severity;
  dispatchEnabled: boolean;
  remoteConfigured: boolean;
  riskLevel: string;
  primaryAgent: string;
  primaryLeaseId: string;
  activeAgentCount: number;
  pendingApprovalCount: number;
  blockerCount: number;
  latestLedgerSequence: number | null;
  readiness: "READY" | "BLOCKED" | "AWAITING_APPROVAL" | "UNAVAILABLE";
  taskCounts: Record<string, number>;
  approvalCounts: Record<string, number>;
}

export interface PrimaryLease {
  leaseId: string;
  sessionId?: string;
  orchestrator: string;
  provider?: string;
  mode?: string;
  state: string;
  processId?: string;
  hostIdentity?: string;
  heartbeatAt?: string;
  expiresAt?: string;
  authority: Authority;
  processLiveness?: {
    alive: boolean | null;
    checkedAt: string;
    clockSource: string;
    authority: Authority;
  };
}

export interface AgentCard {
  agentId: string;
  displayName: string;
  role: string;
  authority: Authority;
  availabilityState: string;
  verificationState: VerificationLabel;
  lastExecution?: string | null;
  executionResult?: string | null;
  evidenceReference?: string | null;
  runtimePromotionPending: boolean;
  sessionIdentity?: string | null;
  status: string;
  frozen: boolean;
  currentTask?: string | null;
  worktree?: string | null;
  branch?: string | null;
  registration?: string | null;
  heartbeatLabel?: string | null;
  permittedActions: string[];
  prohibitedActions: string[];
  blockers: string[];
  recentActions: string[];
  cannotAcquireOrchestratorLease: boolean;
}

export interface ApprovalCard {
  approvalId: string;
  action: string;
  status: NormalizedState;
  fileStatus: string;
  authoritativeDisposition: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  issuedBy?: string | null;
  requestingAgent?: string | null;
  justification?: string | null;
  target?: Record<string, unknown> | null;
  targetSummary: string;
  scopeSummary: string;
  affectedPaths: string[];
  willDo: string[];
  willNotDo: string[];
  preconditions: string[];
  riskLevel?: string | null;
  evidenceRefs: string[];
  consumed: boolean;
  consumptionCount: number;
  executionLimit: number | null;
  ownerActionRequired: boolean;
  authority: Authority;
}

export interface EventItem {
  sequence: number;
  timestamp: string;
  eventType: string;
  severity: Severity;
  summary: string;
  category: string;
  verification: VerificationLabel;
  evidencePath?: string | null;
  taskId?: string | null;
  sessionId?: string | null;
  orchestratorLeaseId?: string | null;
  actor?: string | null;
  provider?: string | null;
  authority: Authority;
}

export interface TaskNode {
  taskId: string;
  project: string;
  objective: string;
  status: NormalizedState;
  owner: string;
  reviewer: string;
  approvalRef?: string | null;
  launchCount: number;
  startedAt?: string | null;
  completedAt?: string | null;
  protocolStatus: string;
  exitResult?: string | null;
  nextPermittedAction: string;
  verification: VerificationLabel;
  dependencies: string[];
  allowedPaths: string[];
  prohibitedPaths: string[];
  worktree?: string | null;
  branch?: string | null;
  commit?: string | null;
  leaseId?: string | null;
  requiredGates: string[];
  evidencePaths: string[];
  blockerClass?: string | null;
  authority: Authority;
  role?: string;
  dispatchMode?: string;
}

export interface HandoffItem {
  handoffId: string;
  fromAgent: string;
  toAgent: string;
  title: string;
  status: NormalizedState;
  path?: string | null;
  sha256?: string | null;
  expiresAt?: string | null;
  taskId?: string | null;
  lifecycleStage:
    | "REQUEST_PUBLISHED"
    | "WORKER_UNAVAILABLE"
    | "ACKNOWLEDGED"
    | "IN_PROGRESS"
    | "RESULT_RECEIVED"
    | "VALIDATED"
    | "ARCHIVED";
  authority: Authority;
  dispatchModel?: "SYNCHRONOUS_ADAPTER";
  acknowledgmentProtocol?: string;
  completionProtocol?: string;
}

export type ProjectClassification =
  | "ADOS_CONTROL_PLANE"
  | "ADOS_COMPONENT_REPOSITORY"
  | "INTEGRATION_WORKTREE"
  | "TEST_WORKTREE"
  | "RELATED_SEPARATE_PROJECT"
  | "UNRELATED_PROJECT"
  | "QUARANTINED_ROUTING_INCIDENT";

export interface ProjectCard {
  projectId: string;
  name: string;
  classification: ProjectClassification;
  canonicalPath: string;
  repositoryType: "GIT" | "NON_GIT" | "UNVERIFIED";
  branch?: string | null;
  head?: string | null;
  currentTask?: string | null;
  status: string;
  lastVerifiedAt?: string | null;
  blocker?: string | null;
  nextPermittedAction: string;
  authority: Authority;
}

export interface WorktreeNode {
  repoId: string;
  pathWindows: string;
  pathWsl?: string | null;
  role: string;
  branch?: string | null;
  head?: string | null;
  tree?: string | null;
  dirty?: boolean;
  untracked?: string[];
  ownerAgent?: string | null;
  prunable?: boolean | null;
  remote?: string | null;
  signatureStatus?: string | null;
  authority: Authority;
  observationStatus?: string;
}

export interface EvidenceItem {
  evidenceId: string;
  path: string;
  sha256?: string | null;
  creator?: string | null;
  createdAt?: string | null;
  relatedTaskId?: string | null;
  relatedLeaseId?: string | null;
  relatedApprovalId?: string | null;
  trackedState: "tracked" | "untracked" | "ignored" | "runtime_only" | "archived" | "unknown";
  redactionStatus?: string | null;
  trustFlags: string[];
  verification: VerificationLabel;
  authority: Authority;
  sizeBytes?: number;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
}

export interface ReadModelStatus {
  backend: "SQLITE" | "DISABLED";
  status: "READY" | "STALE" | "ERROR" | "DISABLED";
  schemaVersion: number | null;
  lastPersistedAt: string | null;
  watermarkCount: number;
  recoveredFromCache: boolean;
}

export interface RoutingIncident {
  incidentId: string;
  timestamp?: string | null;
  intendedProject: string;
  incorrectRepository: string;
  branch?: string | null;
  commit?: string | null;
  containmentStatus: string;
  ownerDispositionRequired: boolean;
  resolution: string;
  verification: VerificationLabel;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  category: "LEDGER" | "APPROVAL" | "EXECUTION" | "PROTOCOL" | "EVIDENCE" | "ROUTING" | "GOVERNANCE" | "MILESTONE";
  title: string;
  summary: string;
  severity: Severity;
  verification: VerificationLabel;
  evidenceReference?: string | null;
}

export interface SafetyAlert {
  alertId: string;
  severity: Severity;
  code: string;
  message: string;
}

export interface MissionSnapshot {
  schemaVersion: string;
  snapshotAt: string;
  productName: string;
  uiTitle: string;
  systemHealth: SystemHealth;
  primaryLease: PrimaryLease;
  agents: AgentCard[];
  approvals: ApprovalCard[];
  pendingApprovals: ApprovalCard[];
  recentEvents: EventItem[];
  auditTimeline: AuditEntry[];
  alerts: SafetyAlert[];
  tasks: TaskNode[];
  handoffs: HandoffItem[];
  projects: ProjectCard[];
  worktrees: WorktreeNode[];
  evidence: EvidenceItem[];
  routingIncidents: RoutingIncident[];
  campaigns: CampaignCard[];
  ownerGates: OwnerGateCard[];
  freshness: FreshnessLabel;
  readModel: ReadModelStatus;
  ownerActions: string[];
  workflowSummary: {
    nodes: string[];
    activeEdge: string;
  };
  source: {
    mode: SourceMode;
    configured: boolean;
    reachable: boolean;
    sourceLabel: string;
    lastIngestAt: string | null;
    lastSuccessfulRefresh: string | null;
    parsingWarningCount: number;
    warnings: string[];
    stale: boolean;
  };
  protocol: {
    dispatchModel: "SYNCHRONOUS_ADAPTER";
    cursorInbox: string;
    cursorCompleted: string;
    acknowledgmentSentinel: "CURSOR_TASK_ACKNOWLEDGED";
    completionSentinel: "CURSOR_TASK_COMPLETED";
    outboxProtocolCreated: false;
  };
}
