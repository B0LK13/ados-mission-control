
# ADOS Nexus — Autonomous Orchestrator PRP and Build Plan

## Executive decision

Build a **custom autonomous control plane**, but do not build every runtime primitive ourselves.

The recommended stack is:

```text
ADOS Nexus
├── Restate                 Durable workflow and autonomous-loop engine
├── ADOS Governance Kernel  Existing leases, roles, candidates and promotion rules
├── OPA                     Deterministic policy and autonomy decisions
├── Action-bound approvals  One-time, scoped, replay-safe authorization
├── Sandcastle              Coding-agent execution, worktrees and sandboxes
├── ACP                     Interactive coding-agent sessions
├── A2A adapter             Future agent discovery and delegation
├── PostgreSQL              Dashboard read model and analytics
├── JSONL hash-chain        Portable, append-only audit evidence
├── OpenTelemetry           Traces, metrics and logs
└── Custom Next.js panel    Fleet, tasks, approvals, evidence and live activity
```

This requirement changes the earlier decision about a durable workflow engine. Once the system must run continuously, survive restarts, redistribute work and wait for approvals without holding a live process, a durable engine becomes justified.

**Restate is the best local-first choice**. It provides reliable execution, exactly-once communication, durable timers, consistent per-entity state, suspension and resumption, introspection, and OpenTelemetry support. It can also run locally through Docker or `npx`.

Sandcastle remains the right execution layer. It already provides coding-agent adapters, Docker and Podman sandboxes, worktree/branch strategies, stream forwarding, raw logging, session handling and process timeouts.

---

# Critical design principle: agents must not approve themselves

The system can avoid interrupting you for routine actions, but an LLM should not be the final enforcement authority.

The safer model is:

```text
Agent proposes action
        ↓
Deterministic risk classification
        ↓
OPA evaluates owner-approved policy
        ↓
Optional independent-agent recommendations
        ↓
Deterministic approval coordinator
        ↓
ALLOW / DENY / ESCALATE
```

This distinction matters:

* **Agents may recommend** approval or denial.
* **OPA makes the enforceable decision** under an owner-approved autonomy charter.
* High-impact operations still require an authenticated human decision.
* No agent may approve its own work.
* An approval is bound to the exact action, parameters, target, policy version and expiry.

OPA is a mature, general-purpose, context-aware policy engine that separates policy decisions from application code. It is a graduated CNCF project and supports local CLI, REST and embedded integration.

Microsoft’s Agent Governance Toolkit offers useful concepts and implementation material for tool-call policy, identity and audit, but it is currently a public preview. It should be treated as a research reference and optional adapter, not as an irreplaceable dependency.

Its proposed action-bound approval protocol is particularly valuable: an approval must be tied to a cryptographic digest of the exact executable action, must suspend execution until resolved, and must be revalidated immediately before execution.

The same design explicitly treats LLM decisions as advisory rather than authoritative because of determinism, prompt-injection and accountability concerns.

---

# 1. Target architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                           OWNER                               │
│ Autonomy charter · budgets · protected approvals · kill switch│
└──────────────────────────────┬────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────┐
│                   ADOS NEXUS CONTROL PLANE                    │
│                                                               │
│  Restate durable workflows                                   │
│  • mission loop                                               │
│  • task lifecycle                                             │
│  • agent health and failover                                  │
│  • timers and recovery                                        │
│  • worktree/repository serialization                          │
│                                                               │
│  Governance                                                   │
│  • OPA policy decision point                                  │
│  • action-bound approvals                                     │
│  • owner autonomy charter                                     │
│  • role separation                                            │
│  • budgets and blast-radius limits                            │
└──────────────┬───────────────────────┬────────────────────────┘
               │                       │
      ┌────────▼────────┐      ┌───────▼─────────┐
      │ Task Scheduler  │      │ Approval Council │
      │ capability/load │      │ advisory only    │
      │ reliability/cost│      │ Codex + Kimi     │
      └────────┬────────┘      └───────┬─────────┘
               │                       │
┌──────────────▼───────────────────────▼────────────────────────┐
│                      EXECUTION BROKER                         │
│  Sandcastle adapters · runtime identity · execution leases    │
│  Docker/Windows/WSL routing · stream normalization            │
└───────────┬──────────────┬───────────────┬────────────────────┘
            │              │               │
        Claude          Cursor          Codex             Kimi
        planner         implementer     planner/reviewer   certifier
            │              │               │               │
            └──────────────┴───────────────┴───────────────┘
                               │
                    Dedicated worktrees/sandboxes
                               │
┌──────────────────────────────▼────────────────────────────────┐
│                    EVIDENCE AND OBSERVABILITY                 │
│ PostgreSQL read model · JSONL audit · OTel · Prometheus/Loki  │
└──────────────────────────────┬────────────────────────────────┘
                               │
┌──────────────────────────────▼────────────────────────────────┐
│                    ADOS NEXUS CONTROL PANEL                   │
│ Fleet · task DAG · live streams · approvals · diffs · evidence│
└───────────────────────────────────────────────────────────────┘
```

---

# 2. Component decisions

## Restate: durable autonomous-loop engine

Use Restate for control-flow durability, not for executing shell commands directly.

Create these keyed services or virtual objects:

| Restate component  | Responsibility                                  |
| ------------------ | ----------------------------------------------- |
| `MissionWorkflow`  | Runs the bounded autonomous project loop        |
| `TaskWorkflow`     | Owns one task from intake through completion    |
| `AgentObject`      | Serializes assignments and health for one agent |
| `RepositoryObject` | Prevents conflicting repository operations      |
| `WorktreeObject`   | Enforces one active writer per worktree         |
| `ApprovalObject`   | Persists approval requests and resolutions      |
| `CandidateObject`  | Tracks frozen candidate identity                |
| `BudgetObject`     | Tracks cost, runtime and resource consumption   |
| `FailoverWorkflow` | Reconciles stalled orchestrators and workers    |

Restate becomes authoritative for **in-flight workflow state**. It does not replace Git identity, approval evidence or candidate records.

Temporal remains a possible future migration for larger distributed fleets, but it is operationally heavier. Restate’s local launch options and built-in durable state make it the better fit for the current Windows/Docker environment. Temporal remains a robust long-running orchestration engine and should be reconsidered only when the fleet becomes multi-host or highly available.

## OPA: deterministic policy decision point

OPA evaluates:

* Whether a task may be created
* Whether an agent is eligible
* Whether an action can auto-proceed
* Whether independent review is required
* Whether a human must approve
* Whether an action is prohibited
* Whether a candidate may enter certification
* Whether promotion is legal
* Whether failover may occur automatically
* Whether an autonomy or budget limit has been reached

Policy changes themselves remain owner-controlled and versioned.

## Sandcastle: coding-agent execution

Sandcastle handles:

* Agent CLI command construction
* Structured output parsing
* Docker/Podman sandbox lifecycle
* Worktree creation
* Session IDs and resume
* Raw stream forwarding
* Idle and completion timeouts
* Commit collection
* Warm reusable sandboxes

ADOS Nexus wraps it with stronger policy:

```text
Sandcastle MAY:
  start an approved worker
  create an approved branch/worktree
  capture output
  return commits and artifacts

Sandcastle MUST NOT:
  merge to canonical
  push
  tag
  promote
  create owner approvals
  change autonomy policy
  transfer orchestrator authority
```

Never use `merge-to-head` for governed tasks. Use explicit branch strategies only.

## ACP: interactive sessions

ACP is the appropriate protocol between the control panel or editor and coding agents. It standardizes communication between coding agents and interactive clients, and the current stable protocol version is 1.

Use ACP for:

* Session creation
* Conversation display
* Tool calls and results
* Permission requests
* Cancellation
* Agent status
* Interactive follow-ups

Do not use ACP for owner approvals, candidate promotion or orchestrator leases.

## A2A: later interoperability adapter

A2A is useful for agent discovery, capability cards and task exchange, but its JavaScript SDK currently implements protocol v0.3 while v1.0 support is beta.

Therefore:

* Build an internal versioned `AgentCapabilityCard` now.
* Model it after A2A Agent Cards.
* Add an A2A adapter after its v1 JavaScript implementation stabilizes.
* Do not make A2A a core dependency in the first production release.

A2A cards already model agent identity, skills, capabilities, input/output modes and multiple transports, which is a strong pattern for the registry.

## Custom dashboard instead of adopting Agent Canvas as authority

OpenHands Agent Canvas is an excellent reference and optional session viewer. It supports local, Docker, VM and remote backends, automations, Claude Code, Codex and ACP-compatible agents.

However, it is marked beta, and direct host mode can give agents full filesystem access.

Build a custom control panel because ADOS requires unique concepts:

* Orchestrator lease
* Owner autonomy charter
* Action-bound approvals
* Frozen candidates
* Independent certification
* Repository/worktree ownership
* Runtime identity and drift
* Policy explanation
* Evidence integrity

Agent Canvas can later be embedded or linked as an ACP session viewer.

---

# 3. Autonomous approval model

## Owner autonomy charter

Instead of approving every action, the owner approves a **versioned autonomy charter**.

Example:

```yaml
schemaVersion: "1.0"
charterId: autonomy-balanced-2026-07
profile: BALANCED
validFrom: 2026-07-16T00:00:00Z
expiresAt: 2026-08-16T00:00:00Z

limits:
  maxConcurrentMutatingAgents: 2
  maxConcurrentReadOnlyAgents: 4
  maxTaskRuntimeMinutes: 90
  maxMissionRuntimeHours: 12
  maxAutomaticRetries: 1
  maxChangedFilesPerTask: 40
  maxChangedLinesPerTask: 2500
  maxDailyModelBudgetEur: 30
  maxDailyComputeHours: 20

autoAllow:
  - repository.read
  - tests.run
  - docs.modify_in_worktree
  - code.modify_in_disposable_worktree
  - candidate.freeze
  - read_only_review
  - local_dependency_install_in_sandbox

alwaysHuman:
  - canonical.merge
  - git.push
  - git.tag
  - remote.configure
  - production.deploy
  - secret.create_or_rotate
  - candidate.promote
  - destructive.delete
  - control_plane_policy_change
  - autonomy_charter_change
```

This charter is the owner’s standing delegation. Routine work proceeds without repeatedly contacting the owner.

## Autonomy levels

| Level                        | Meaning                       | Examples                                                      | Decision                        |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------- | ------------------------------- |
| **A0 Observe**               | No mutation                   | Read repo, inspect logs, generate report                      | Automatic                       |
| **A1 Reversible local**      | Disposable, isolated mutation | Create tests/docs in temporary worktree                       | Automatic                       |
| **A2 Governed candidate**    | Bounded code mutation         | Implement feature on dedicated branch                         | Automatic with evidence gates   |
| **A3 Sensitive reversible**  | Higher trust boundary         | Dependency changes, network access, control-plane maintenance | Independent council plus policy |
| **A4 Irreversible/external** | External or production effect | Merge, push, tag, deploy, delete, secret rotation             | Human                           |
| **A5 Prohibited**            | Never permitted autonomously  | Disable guardrails, export secrets, arbitrary host access     | Automatic deny                  |

## Independent agent council

For A3 actions, request two independent structured recommendations.

Example:

```json
{
  "recommendation": "ALLOW",
  "confidence": 0.94,
  "riskLevel": "MODERATE",
  "evidenceReviewed": [
    "task contract",
    "diff summary",
    "test report",
    "policy explanation"
  ],
  "conditions": [
    "sandbox only",
    "no production endpoint",
    "rollback artifact required"
  ],
  "reasonCodes": [
    "BOUNDED_SCOPE",
    "REVERSIBLE",
    "TESTED"
  ]
}
```

Suggested council:

* **Codex:** architecture, runtime and reliability assessment
* **Kimi:** security, compliance and certification assessment

The policy engine may auto-resolve an A3 action only when:

1. The autonomy charter allows council-based resolution.
2. All deterministic hard gates pass.
3. The recommendations are from agents independent of the implementer.
4. Both recommend `ALLOW`.
5. Confidence meets the policy threshold.
6. Their action digests match.
7. There is no unresolved finding.
8. The action is reversible.
9. The approval has not expired.
10. The approval is consumed atomically with execution.

Any conflict becomes `ESCALATE`, not a majority vote.

## Action-bound approval token

Every approval must contain:

```json
{
  "approvalId": "apr_...",
  "actionDigest": "sha256:...",
  "taskId": "task_...",
  "agentId": "cursor-windows",
  "operation": "repository.modify",
  "resource": "worktree:ados-runtime-v2-wp3",
  "parametersDigest": "sha256:...",
  "policyVersion": "2026.07.1",
  "charterVersion": "balanced-1",
  "issuedAt": "...",
  "expiresAt": "...",
  "singleUse": true,
  "outcome": "ALLOW"
}
```

Changed parameters invalidate the approval. Timeout, malformed evidence or identity mismatch fails closed. This follows the strongest parts of the action-bound protocol, including append-only chain entries, expiry, idempotency and immediate pre-execution validation.

---

# 4. Autonomous mission loop

The autonomous loop must be **bounded**, not an unrestricted infinite loop.

```text
1. Reconcile
2. Inspect mission goal
3. Discover pending work
4. Decompose work
5. Build dependency DAG
6. Classify risk
7. Select eligible agents
8. Allocate tasks
9. Execute
10. Monitor
11. Review
12. Certify
13. Promote or queue owner decision
14. Update metrics
15. Select next ready task
16. Stop when done, blocked, unsafe or budget-exhausted
```

## Mission termination rules

A mission stops when any applies:

* Goal and acceptance criteria are satisfied
* No ready task exists
* Owner decision is required
* Mission budget is exhausted
* No progress occurred for three cycles
* Same defect failed twice
* Policy integrity is uncertain
* Evidence is incomplete
* Git identity cannot be reconciled
* Conflicting writers are detected
* A secret exposure or security incident occurs
* All eligible agents are unhealthy
* The kill switch is activated

The system must never “keep trying” indefinitely.

---

# 5. Task allocation and load balancing

## Agent capability card

```json
{
  "agentId": "cursor-windows",
  "provider": "CURSOR",
  "runtime": "WINDOWS_NATIVE",
  "roles": ["IMPLEMENTER", "REMEDIATOR"],
  "capabilities": [
    "typescript",
    "react",
    "powershell",
    "windows",
    "docker",
    "git"
  ],
  "constraints": {
    "maxConcurrentTasks": 1,
    "supportsReadOnly": true,
    "supportsMutation": true,
    "supportsCertification": false
  },
  "health": {
    "state": "AVAILABLE",
    "lastHeartbeatAt": "...",
    "rateLimited": false
  },
  "performance": {
    "successRate30d": 0.92,
    "medianAckSeconds": 18,
    "medianTaskMinutes": 34,
    "certificationPassRate": 0.86
  }
}
```

Agents cannot modify their own trusted capability or performance records.

## Eligibility filters

Before scoring, reject agents that fail any hard condition:

* Wrong role
* Wrong operating system/runtime
* Unhealthy or rate-limited
* Already at concurrency limit
* Missing required capability
* Worktree incompatibility
* Runtime identity drift
* Policy prohibits assignment
* Agent implemented the candidate and task requires certification
* Agent already planned and task requires independent review
* Agent is current orchestrator and assignment could obstruct failover
* Required context or credential is unavailable

## Allocation score

For eligible agents:

```text
score =
    0.28 × capability_match
  + 0.18 × recent_reliability
  + 0.14 × availability
  + 0.10 × context_affinity
  + 0.10 × estimated_quality
  + 0.08 × expected_speed
  + 0.05 × cost_efficiency
  + 0.04 × reviewer_diversity
  + 0.03 × warm_session_bonus
  - overload_penalty
  - recent_failure_penalty
  - rate_limit_penalty
```

All inputs must be visible in the dashboard.

## Optional bid phase

For high-complexity tasks, eligible agents receive a short read-only call for proposals:

```json
{
  "response": "ACCEPT",
  "confidence": 0.88,
  "estimatedMinutes": 45,
  "requiredCapabilities": [],
  "requiredPermissions": ["network:npmjs.org"],
  "blockers": [],
  "proposedApproachDigest": "sha256:..."
}
```

The scheduler chooses. Agents do not assign tasks to one another.

## Reassignment

A task is automatically released and reconsidered when:

* No acknowledgment within 180 seconds
* Process exits before acknowledgment
* Rate limit prevents progress
* Heartbeat expires
* Agent declares a blocker
* Idle timeout occurs
* Circuit breaker opens
* Orchestrator explicitly drains the agent

No automatic reassignment occurs after a partial mutation until reconciliation verifies the worktree and evidence.

---

# 6. Failover design

## Orchestrator role becomes mostly deterministic

The long-term goal is to remove process supervision from Claude.

```text
Restate + policy engine:
  schedules
  tracks
  retries durable steps
  reallocates
  waits
  recovers

Claude/Codex:
  plan
  reason
  review
  resolve ambiguity
```

This means Claude being unavailable no longer stops routine execution.

## Planner failover

Preferred role order:

```text
Primary planner:   Claude
Fallback planner:  Codex
Emergency planner: Kimi, read-only and low-risk only
```

Kimi may not certify a candidate it planned. The scheduler must assign another independent certifier or escalate.

## Automatic orchestrator failover

Automatic failover may occur under a pre-approved charter only when:

* Existing heartbeat is stale beyond the configured threshold
* Recorded process is absent
* No active writer or worker mutation exists
* No files are changing
* A takeover checkpoint is captured
* Standby runtime is healthy
* Lease identity and approval policy validate
* Target starts in `RECOVERY_ONLY`
* Reconciliation succeeds before promotion to `PRIMARY`

Conflicting process evidence must require human review.

## Role lock

Codex cannot be a mutating implementation worker and standby orchestrator simultaneously.

States:

```text
STANDBY_AVAILABLE
WORKER_ASSIGNED
WORKER_ACTIVE
WORKER_DRAINING
STANDBY_READY
FAILOVER_ACQUIRING
ORCHESTRATOR_ACTIVE
```

Failover is allowed only from `STANDBY_READY`.

---

# 7. Control panel design

## Navigation

### Command Center

Displays:

* Mission status
* Current autonomous cycle
* Active orchestrator
* Agent health
* Running tasks
* Blocked tasks
* Pending owner decisions
* Budget usage
* Recent failures
* Security alerts
* Global pause and emergency stop

### Agent Fleet

Each card shows:

* Provider and runtime
* Current role
* Health
* Current task
* Task progress
* Context/session ID
* Queue depth
* Rate-limit state
* Reliability
* Average duration
* Cost
* Last acknowledgment
* Last heartbeat
* Drain, quarantine and inspect controls

### Task Graph

Use a visual DAG:

```text
Planning
   ├── Backend
   ├── Frontend
   └── Tests
         ↓
   Integration
         ↓
   Certification
         ↓
   Owner promotion
```

Node colors represent:

* Ready
* Assigned
* Running
* Waiting for approval
* Blocked
* Failed
* Certified
* Completed

### Live Run

Include:

* Public agent messages
* Tool calls and tool results
* Raw stream toggle
* Current command
* Changed files
* Git diff
* Tests
* Resource usage
* Policy decisions
* Approval chain
* Cancel and pause controls

Do not display hidden chain-of-thought.

### Approval Center

Each decision card must explain:

```text
Requested action
Risk tier
Action digest
Implementing agent
Target repository/worktree
Expected blast radius
Reversibility
Policy rules matched
Agent council recommendations
Evidence available
Decision expiry
Why it was auto-allowed, denied or escalated
```

### Policies and Autonomy

Provide:

* Active profile
* Policy version
* Diff from previous version
* Simulation mode
* Test results
* Allowed action matrix
* Human-only operations
* Budget controls
* Failover policy
* Proposed changes awaiting owner approval

### Repositories and Worktrees

Show:

* Canonical HEAD/tree
* Branches
* Worktree owner
* Active execution lease
* Dirty state
* Candidate status
* Certification status
* Remote/tag state
* Cleanup eligibility

### Evidence

Show:

* Run artifacts
* JSONL events
* Hash chain
* Test reports
* Prompts
* Acknowledgments
* Completion records
* Approval records
* Certification reports
* Download/export package

### Reliability and Cost

Show:

* Task success rate
* First-pass certification rate
* Mean time to acknowledgment
* Mean recovery time
* Failure causes
* Cost per completed task
* Token usage
* Agent utilization
* Auto-approval rate
* Human-escalation rate
* Policy denial rate

OpenTelemetry provides the cross-language tracing foundation, allowing Restate, the TypeScript broker, Sandcastle adapters and dashboard API to share trace context.

---

# 8. State models

## Task lifecycle

```text
DRAFT
  → PLANNED
  → POLICY_EVALUATING
  → READY
  → ALLOCATING
  → ASSIGNED
  → ACK_PENDING
  → RUNNING
  → REVIEW_PENDING
  → CERTIFICATION_PENDING
  → PROMOTION_PENDING
  → COMPLETED
```

Alternate states:

```text
WAITING_APPROVAL
BLOCKED
CANCEL_REQUESTED
CANCELLED
FAILED
TIMED_OUT
UNKNOWN_REQUIRES_RECONCILIATION
QUARANTINED
```

## Agent lifecycle

```text
REGISTERING
AVAILABLE
RESERVED
BUSY
DRAINING
DEGRADED
RATE_LIMITED
OFFLINE
QUARANTINED
```

## Approval lifecycle

```text
POLICY_EVALUATING
AUTO_ALLOWED
AUTO_DENIED
COUNCIL_PENDING
HUMAN_PENDING
APPROVED
DENIED
EXPIRED
CANCELLED
CONSUMED
```

## Candidate lifecycle

```text
CREATED
VALIDATING
VALIDATED
FROZEN
CERTIFYING
CERTIFIED
REJECTED
REMEDIATION_REQUIRED
PROMOTION_PENDING
PROMOTED
SUPERSEDED
```

---

# 9. Storage and authority model

| Data                         | Authority                                     |
| ---------------------------- | --------------------------------------------- |
| Source code identity         | Git                                           |
| Active workflow state        | Restate                                       |
| Orchestrator/worktree leases | Governance kernel backed by Restate           |
| Policies                     | Versioned repository files                    |
| Owner charter                | Signed/versioned governance record            |
| Approval resolution          | Action-bound approval store                   |
| Operational dashboard        | PostgreSQL read model                         |
| Audit evidence               | Append-only JSONL hash chain                  |
| Metrics and traces           | OpenTelemetry backend                         |
| Agent conversation/session   | Provider session store plus normalized events |

PostgreSQL is a derived operational model. It must be rebuildable from workflow and audit events.

JSONL evidence must remain portable and independent of PostgreSQL.

---

# 10. Repository design

```text
D:\agent-development-os-runtime-v2
├── apps
│   ├── control-api
│   ├── dashboard
│   ├── worker-host
│   └── cli
├── services
│   ├── restate-runtime
│   ├── policy-service
│   ├── event-projector
│   └── telemetry-collector
├── packages
│   ├── contracts
│   ├── event-model
│   ├── governance-kernel
│   ├── approval-coordinator
│   ├── autonomy-engine
│   ├── agent-registry
│   ├── task-scheduler
│   ├── mission-planner
│   ├── restate-workflows
│   ├── sandcastle-adapter
│   ├── cursor-provider
│   ├── kimi-provider
│   ├── claude-provider
│   ├── codex-provider
│   ├── acp-gateway
│   ├── a2a-adapter
│   ├── evidence-store
│   ├── postgres-read-model
│   ├── observability
│   ├── security
│   └── testkit
├── policies
│   ├── autonomy.rego
│   ├── roles.rego
│   ├── approvals.rego
│   ├── repositories.rego
│   ├── worktrees.rego
│   ├── network.rego
│   ├── budgets.rego
│   └── failover.rego
├── config
│   ├── agents
│   ├── autonomy-profiles
│   ├── runtimes
│   └── schemas
├── tests
│   ├── unit
│   ├── contract
│   ├── integration
│   ├── end-to-end
│   ├── fault-injection
│   ├── security
│   └── fixtures
├── docs
│   ├── adr
│   ├── architecture
│   ├── operations
│   ├── security
│   └── runbooks
├── evidence
├── docker
├── compose.yaml
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

# 11. PRP — Product Requirements Plan

## Product name

**ADOS Nexus Autonomous Orchestrator**

## Primary objective

Create a local-first, durable, policy-governed orchestration platform that continuously plans, assigns, supervises, reviews and certifies software-development work across Claude, Cursor, Codex and Kimi while minimizing routine human intervention.

## Primary users

* Owner/operator
* Primary planner/orchestrator
* Implementation agents
* Review and certification agents
* Future remote fleet operators

## Functional requirements

### FR-01 — Mission management

The owner can define:

* Mission objective
* Repositories
* Allowed scope
* Acceptance criteria
* Autonomy profile
* Time and cost budgets
* Protected operations
* Termination conditions

### FR-02 — Durable execution

The system must survive:

* Control API restart
* Dashboard restart
* Agent process crash
* Worker host restart
* Network interruption
* Approval wait
* Model rate limit
* Restate worker restart

### FR-03 — Dynamic task planning

Planner agents may propose tasks and dependency graphs. The deterministic control plane validates and persists them.

### FR-04 — Capability-based allocation

The scheduler allocates tasks based on capability, load, health, reliability, cost, runtime compatibility and independence requirements.

### FR-05 — Automatic failover

Unavailable or overloaded agents are bypassed automatically when policy permits.

### FR-06 — Autonomous approvals

Routine actions proceed through owner-approved policies without per-action human interaction.

### FR-07 — Human escalation

Irreversible, external, ambiguous or high-risk actions are presented in the control panel.

### FR-08 — Role separation

The system enforces planner, implementer, reviewer, certifier and promoter boundaries.

### FR-09 — Isolated execution

Mutations occur in dedicated worktrees and sandboxed execution environments.

### FR-10 — Live observability

All public agent output, tool calls, process state, policy decisions and tests appear in near real time.

### FR-11 — Evidence

Every meaningful transition produces linked, replayable evidence.

### FR-12 — Recovery

Interrupted actions become reconciled states rather than silently retried.

### FR-13 — Budget control

The system enforces mission, daily and per-agent budgets.

### FR-14 — Emergency controls

The owner can:

* Pause mission
* Pause new dispatches
* Drain an agent
* Quarantine runtime
* Cancel task
* Disable auto-approval
* Force human-only mode
* Stop all mutation

## Non-functional requirements

| Requirement                            | Target                     |
| -------------------------------------- | -------------------------- |
| Policy evaluation                      | p95 under 100 ms           |
| Dashboard event latency                | p95 under 2 seconds        |
| Task reassignment after confirmed loss | under 60 seconds           |
| Duplicate external actions             | zero                       |
| Approval replay                        | zero                       |
| Secret leakage in evidence             | zero                       |
| Event loss during process restart      | zero                       |
| Worktree concurrent writers            | zero                       |
| Audit reconstruction                   | 100% of governed actions   |
| Autonomous soak test                   | 24 hours minimum           |
| Control-plane recovery                 | under 5 minutes            |
| Availability target                    | 99.5% local operating time |

## Explicit non-goals for v1

* Fully autonomous production deployment
* Automatic push or merge to protected branches
* Self-modifying policies
* Agents modifying their own trust scores
* Reinforcement learning
* Unbounded task generation
* Cross-organization federation
* Public internet exposure
* More than two simultaneous mutating workers
* Automatic secret rotation

---

# 12. Implementation roadmap and agent distribution

## Workload target

| Role   | Share |
| ------ | ----: |
| Claude |   15% |
| Cursor |   35% |
| Codex  |   30% |
| Kimi   |   20% |

Claude should no longer write most implementation code.

## Safe parallelism

Permit two simultaneous mutating workers only when:

* They use different branches and worktrees
* Path ownership does not overlap
* Neither edits the root lockfile concurrently
* Neither changes shared schemas concurrently
* Integration is queued through Claude
* Both hold separate execution leases

Create:

```yaml
pathOwnership:
  cursor:
    - apps/dashboard/**
    - packages/sandcastle-adapter/**
    - packages/acp-gateway/**
  codex:
    - services/restate-runtime/**
    - packages/task-scheduler/**
    - packages/autonomy-engine/**
    - packages/approval-coordinator/**
```

Shared files are owned by an integration work package.

---

## Phase N0 — Architecture and contracts

### Claude

* Reconcile current control-plane state
* Create master program
* Define task contracts
* Create owner autonomy charter draft
* Create ADR index
* Validate all worker outputs

### Codex

* Design Restate service boundaries
* Design task and failover state machines
* Design data consistency model
* Produce failure-mode analysis

### Cursor

* Scaffold monorepo
* Configure TypeScript, pnpm, lint and tests
* Create contract and event packages
* Create initial Docker Compose

### Kimi

* Create certification contract
* Create threat model
* Define security negative tests
* Review autonomy levels

**Gate:** architecture approved; no real agent execution.

---

## Phase N1 — Durable workflow kernel

### Codex, primary implementer

Implement:

* `MissionWorkflow`
* `TaskWorkflow`
* `AgentObject`
* `RepositoryObject`
* `WorktreeObject`
* `BudgetObject`
* Durable timers
* Idempotency
* Restart recovery
* Task cancellation

### Cursor, independent implementation support

Implement:

* Test fixtures
* Fake-agent workers
* CLI status client
* Basic control API endpoints

### Kimi

Certify:

* Duplicate suppression
* Restart recovery
* Task state validity
* Lease exclusivity
* Cancellation

**Gate:** all fake workflows survive controlled restarts.

---

## Phase N2 — Governance and autonomous approval

### Codex, primary implementer

Implement:

* OPA integration
* Policy input schemas
* Action-binding canonicalization
* SHA-256 action digests
* Approval request store
* Expiry and single-use consumption
* Policy explanation API
* Autonomy profiles

### Cursor

Implement:

* Approval Center UI
* Policy simulator UI
* Autonomy profile UI
* Approval audit timeline

### Kimi

Perform:

* Replay attacks
* Parameter-swap tests
* Stale-policy tests
* Wrong-agent tests
* Self-approval tests
* Timeout fail-closed tests

**Gate:** low-risk actions auto-resolve; high-risk actions never auto-resolve.

---

## Phase N3 — Agent registry and scheduler

### Codex

Implement:

* Agent capability cards
* Eligibility filters
* Weighted scoring
* Health states
* Circuit breakers
* Role locks
* Planner failover
* Call-for-proposals protocol
* Reassignment rules

### Cursor

Implement:

* Fleet dashboard
* Agent card UI
* Queue visualization
* Task DAG
* Drain and quarantine controls
* Scheduler explanation view

### Kimi

Certify:

* Implementer cannot certify
* Planner independence
* Overload behavior
* Rate-limit behavior
* No eligible agent handling
* Conflicting role rejection

**Gate:** scheduler reliably reallocates fake tasks without duplicate mutation.

---

## Phase N4 — Sandcastle execution plane

### Cursor, primary implementer

Implement:

* Sandcastle adapter
* Explicit branch strategy
* Docker sandbox policy
* Stream normalization
* Raw-event preservation
* Prompt and result contracts
* Commit collection
* Idle and completion timeouts
* Worktree lifecycle

### Codex

Implement or review:

* Execution lease integration
* Sandcastle fault adapter
* Runtime identity verification
* Recovery semantics
* No-auto-retry enforcement

### Kimi

Certify:

* No `merge-to-head`
* No Docker socket
* No broad host mounts
* No unauthorized network
* Process cleanup
* Session capture
* Result validation

**Gate:** fake agents only; 24-hour soak.

---

## Phase N5 — Real agent adapters

### Cursor

Implement and verify Cursor provider.

### Codex

Implement and verify Codex/Claude provider integration where Sandcastle behavior needs wrapping.

### Kimi

Kimi remains the certifier while Cursor implements the Kimi provider.

Empirically test:

* Non-interactive mode
* Session IDs
* Resume
* Structured streams
* Tool-call parsing
* Exit-code behavior
* Rate limits
* Cancellation
* Windows/Docker/WSL routing

**Gate:** disposable repositories only.

---

## Phase N6 — Control panel

### Cursor, primary implementer

Build:

* Command Center
* Fleet
* Task DAG
* Run detail
* Live terminal
* Approval Center
* Policy simulator
* Repository/worktree view
* Evidence explorer
* Cost and reliability analytics
* Settings and autonomy profiles

### Codex

Implement:

* Query/read-model service
* Event projector
* Aggregation APIs
* WebSocket/SSE gateway
* Dashboard authorization

### Kimi

Perform UX/security review:

* Dangerous actions clearly separated
* Policy rationale visible
* No secret rendering
* Kill switch unambiguous
* Stale information warnings

**Gate:** all protected actions require explicit UI confirmation when policy says human.

---

## Phase N7 — Fault injection and security

Required scenarios:

* Claude unavailable
* Codex unavailable
* Cursor hangs
* Kimi rate-limited
* Restate worker killed
* Control API killed
* Dashboard restarted
* Docker unavailable
* Worktree dirty
* Git HEAD changes unexpectedly
* Event duplicated
* JSONL truncated
* PostgreSQL unavailable
* Policy bundle corrupt
* Approval replay
* Action parameters changed
* Approval expires mid-run
* Agent emits malformed JSON
* Secret appears in stdout
* Process spawns orphan
* Disk becomes full

Kimi leads certification. Codex performs reliability analysis. Cursor remediates defects.

---

## Phase N8 — Shadow mode

Run the existing control plane and Nexus together.

Nexus initially:

* Observes tasks
* Builds allocation decisions
* Simulates policies
* Produces shadow approvals
* Does not dispatch production work

Compare decisions for at least:

* 25 tasks
* 5 agent failures
* 5 approval escalations
* 3 interrupted sessions
* 2 orchestrator failovers

---

## Phase N9 — Controlled autonomy

Roll out autonomy profiles gradually:

```text
Stage 1: A0 only
Stage 2: A0–A1
Stage 3: A0–A2
Stage 4: selected A3 actions with council
Stage 5: broader A3 after evidence
```

A4 remains human-controlled.

---

# 13. Acceptance tests

## Governance

* Every execution has a valid active orchestrator
* Every mutation has a valid execution lease
* Every autonomous action is allowed by a versioned charter
* Every approval is action-bound
* Approval cannot be replayed
* Agent cannot approve itself
* Certifier cannot remediate its candidate
* Policy changes require owner approval
* Promotion remains owner-gated

## Scheduler

* Overloaded Claude causes planning to route to Codex
* Offline Cursor causes implementation to wait or route legally
* Busy Kimi does not block unrelated implementation
* No task is assigned to an incapable agent
* No two agents write the same worktree
* No certifier shares implementation lineage
* Failure penalties affect later allocation
* Agent recovery closes its circuit breaker only after validation

## Autonomous loop

* Loop runs for 24 hours with fake tasks
* Completed tasks are not repeated
* Blocked tasks do not busy-loop
* Budget exhaustion stops dispatch
* No-progress detector stops the mission
* Human decision pauses only the dependent branch of the DAG
* Independent tasks continue while one branch awaits approval

## Approval

* A0 and A1 proceed automatically
* A2 proceeds only with evidence gates
* A3 requires council when configured
* A4 always reaches the owner
* A5 is always denied
* Conflicting council results escalate
* Missing council response fails closed
* Changed action digest invalidates approval

## Recovery

* Restart during planning resumes
* Restart during execution reconciles before retry
* Restart during approval preserves pending state
* Stale worker cannot consume approval
* Orphan process is detected
* Orphan worktree is quarantined
* Dashboard reconstructs complete history

---

# 14. Initial owner directive for Claude

Use this as the next planning instruction:

```text
CLAUDE PRIMARY ORCHESTRATOR — PLAN ADOS NEXUS AUTONOMOUS CONTROL PLANE

The current emergency takeover and observable-terminal remediation are complete.
Claude remains PRIMARY. Codex is STANDBY unless explicitly assigned as a bounded
worker.

Create a planning-only program for:

  ADOS Nexus Autonomous Orchestrator

Target architecture:

  Restate durable workflows
  existing ADOS governance kernel
  OPA policy decisions
  action-bound approval coordinator
  Sandcastle execution plane
  ACP interactive gateway
  future A2A adapter
  PostgreSQL operational read model
  JSONL hash-chained evidence
  OpenTelemetry
  custom Next.js control panel

Core policy:

Agents may provide structured approval or denial recommendations, but no LLM is
the final enforcement authority. Final autonomous decisions are made by the
deterministic policy engine under a versioned owner autonomy charter.

Human approval remains mandatory for:

  merge
  push
  tag
  deploy
  destructive deletion
  secret changes
  remote configuration
  candidate promotion
  policy changes
  autonomy charter changes
  break-glass operations

Create these planning artifacts:

  docs/ADOS-NEXUS-PROGRAM.md
  docs/ADOS-NEXUS-PRP.md
  docs/architecture/ADOS-NEXUS-ARCHITECTURE.md
  docs/security/ADOS-NEXUS-THREAT-MODEL.md
  docs/operations/ADOS-NEXUS-AUTONOMY-MODEL.md

  docs/adr/ADR-NX-001-RESTATE-DURABLE-CORE.md
  docs/adr/ADR-NX-002-OPA-POLICY-DECISION-POINT.md
  docs/adr/ADR-NX-003-ACTION-BOUND-APPROVALS.md
  docs/adr/ADR-NX-004-SANDCASTLE-EXECUTION-PLANE.md
  docs/adr/ADR-NX-005-ACP-AND-A2A-BOUNDARIES.md
  docs/adr/ADR-NX-006-POSTGRES-READ-MODEL-JSONL-AUDIT.md
  docs/adr/ADR-NX-007-BOUNDED-AUTONOMOUS-LOOP.md
  docs/adr/ADR-NX-008-AGENT-ROLE-SEPARATION.md

Create separate Wave N0 task contracts:

  Cursor:
    monorepo and contracts scaffold plan

  Codex:
    Restate, scheduler and failure-model design

  Kimi:
    autonomy/security certification contract

Claude must not implement the Runtime V2 application during this task.

Codex and Kimi may work concurrently in read-only planning roles.

Do not create or initialize the new implementation repository until an owner
reviews the N0 plan.

Do not launch real agent runtime smoke tests.

Do not change Agent Development OS or either frozen WP-4.2 candidate.

Required final state:

  CLAUDE_PRIMARY_STABLE
  ADOS_NEXUS_N0_PLAN_COMPLETE
  CURSOR_N0_TASK_READY
  CODEX_N0_TASK_READY
  KIMI_N0_TASK_READY
  IMPLEMENTATION_AWAITING_OWNER_APPROVAL
```

---

# Final recommendation

The most efficient operating model is no longer:

```text
Claude manually coordinates every transition
```

It becomes:

```text
Restate runs the durable process
OPA controls authority
Sandcastle runs coding agents
Claude and Codex plan
Cursor implements
Kimi certifies
The owner handles only irreversible or exceptional decisions
```

This provides genuine autonomy without handing unrestricted authority to a stochastic model. Routine work continues, overloaded agents are bypassed, independent branches keep progressing while one decision is pending, and every action remains explainable, bounded and recoverable. 🛡️
