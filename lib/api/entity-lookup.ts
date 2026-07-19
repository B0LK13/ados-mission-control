import type { MissionSnapshot } from "@/lib/contracts";
import { missionJson } from "@/lib/http";

export function notFoundResponse(entity: string, id: string): Response {
  return missionJson(
    { error: { code: "NOT_FOUND", message: `${entity} '${id}' was not found in the current read model.` } },
    404,
  );
}

export function unavailableEntityResponse(entity: string, id: string): Response {
  return missionJson(
    {
      error: {
        code: "UNAVAILABLE",
        message: `${entity} '${id}' is present but marked UNAVAILABLE — Mission Control does not fabricate detail.`,
      },
    },
    404,
  );
}

export function findAgent(snapshot: MissionSnapshot, agentId: string) {
  return snapshot.agents.find((item) => item.agentId === agentId) || null;
}

export function findTask(snapshot: MissionSnapshot, taskId: string) {
  return snapshot.tasks.find((item) => item.taskId === taskId) || null;
}

export function findApproval(snapshot: MissionSnapshot, approvalId: string) {
  return snapshot.approvals.find((item) => item.approvalId === approvalId) || null;
}

export function findProject(snapshot: MissionSnapshot, projectId: string) {
  return snapshot.projects.find((item) => item.projectId === projectId) || null;
}

export function findHandoff(snapshot: MissionSnapshot, handoffId: string) {
  return snapshot.handoffs.find((item) => item.handoffId === handoffId) || null;
}

export function findWorktree(snapshot: MissionSnapshot, repoId: string) {
  return snapshot.worktrees.find((item) => item.repoId === repoId) || null;
}

export function findEvidence(snapshot: MissionSnapshot, evidenceId: string) {
  return snapshot.evidence.find((item) => item.evidenceId === evidenceId) || null;
}
