import type { TaskNode } from "@/lib/contracts";

export interface TaskDependencyEdge {
  fromTaskId: string;
  toTaskId: string;
  resolved: boolean;
}

export interface TaskDependencyNode {
  taskId: string;
  status: string;
  present: boolean;
  dependencyCount: number;
  dependentCount: number;
}

export interface TaskDependencyGraph {
  nodes: TaskDependencyNode[];
  edges: TaskDependencyEdge[];
  unresolvedDependencyIds: string[];
  warnings: string[];
}

/**
 * Build an adjacency view from task.dependencies only.
 * Never invents edges; unresolved dependency IDs are listed, not fabricated as tasks.
 */
export function buildTaskDependencyGraph(tasks: TaskNode[]): TaskDependencyGraph {
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  const edges: TaskDependencyEdge[] = [];
  const unresolved = new Set<string>();
  const dependentCounts = new Map<string, number>();

  for (const task of tasks) {
    for (const depId of task.dependencies || []) {
      if (!depId || typeof depId !== "string") continue;
      const resolved = byId.has(depId);
      edges.push({ fromTaskId: depId, toTaskId: task.taskId, resolved });
      if (!resolved) unresolved.add(depId);
      dependentCounts.set(depId, (dependentCounts.get(depId) || 0) + 1);
    }
  }

  const nodes: TaskDependencyNode[] = tasks.map((task) => ({
    taskId: task.taskId,
    status: task.status,
    present: true,
    dependencyCount: (task.dependencies || []).length,
    dependentCount: dependentCounts.get(task.taskId) || 0,
  }));

  const warnings: string[] = [];
  if (!edges.length) {
    warnings.push("No task dependency edges were present in the current snapshot.");
  }
  if (unresolved.size) {
    warnings.push(`${unresolved.size} dependency id(s) reference tasks not present in the snapshot.`);
  }

  return {
    nodes,
    edges,
    unresolvedDependencyIds: [...unresolved].sort(),
    warnings,
  };
}
