/**
 * Learnova Prerequisite DAG & Dependency Validation
 * Enforces acyclic prerequisite relationships among curriculum topics.
 */

export interface PrerequisiteValidationResult {
  valid: boolean;
  error?: string;
  cyclePath?: string[];
}

/**
 * Checks whether adding a dependency (targetTopic depends on prereqTopic)
 * would create a circular dependency in the graph.
 *
 * @param adjacencyList Map of topicId -> array of topicIds it directly depends on (its prerequisites)
 * @param topicId The topic that will have the new prerequisite
 * @param proposedPrereqId The topic to be added as a prerequisite
 * @param topicNames Optional map of topicId -> topic title for human-readable error messages
 */
export function validatePrerequisiteAddition(
  adjacencyList: Record<string, string[]>,
  topicId: string,
  proposedPrereqId: string,
  topicNames: Record<string, string> = {}
): PrerequisiteValidationResult {
  // Rule 1: A topic cannot depend on itself
  if (topicId === proposedPrereqId) {
    return {
      valid: false,
      error: 'A topic cannot be a prerequisite of itself.',
    };
  }

  // Deep clone or create working graph
  const graph: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(adjacencyList)) {
    graph[k] = [...v];
  }
  if (!graph[topicId]) {
    graph[topicId] = [];
  }
  if (!graph[topicId].includes(proposedPrereqId)) {
    graph[topicId].push(proposedPrereqId);
  }

  // To check if topicId -> proposedPrereqId creates a cycle:
  // If we can reach topicId by following prerequisites starting from proposedPrereqId,
  // then adding topicId -> proposedPrereqId closes a cycle!
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(current: string): boolean {
    visited.add(current);
    recursionStack.add(current);
    path.push(current);

    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        path.push(neighbor);
        return true;
      }
    }

    recursionStack.delete(current);
    path.pop();
    return false;
  }

  // Check specifically if from proposedPrereqId we can reach topicId
  const canReach = (start: string, target: string, seen = new Set<string>()): boolean => {
    if (start === target) return true;
    seen.add(start);
    for (const next of graph[start] || []) {
      if (!seen.has(next)) {
        if (canReach(next, target, seen)) return true;
      }
    }
    return false;
  };

  if (canReach(proposedPrereqId, topicId)) {
    const topicLabel = topicNames[topicId] || topicId;
    const prereqLabel = topicNames[proposedPrereqId] || proposedPrereqId;
    return {
      valid: false,
      error: 'This selection would create a circular prerequisite path. Remove one of the conflicting relationships and try again.',
      cyclePath: [topicLabel, prereqLabel, topicLabel],
    };
  }

  return { valid: true };
}

/**
 * Validates an entire topic's set of proposed prerequisites against existing graph.
 */
export function validateAllPrerequisites(
  existingAdjacency: Record<string, string[]>,
  topicId: string,
  proposedPrereqIds: string[],
  topicNames: Record<string, string> = {}
): PrerequisiteValidationResult {
  // First check self-dependency
  if (proposedPrereqIds.includes(topicId)) {
    return {
      valid: false,
      error: 'A topic cannot be a prerequisite of itself.',
    };
  }

  // Build the simulated full graph with topicId having ONLY the proposedPrereqIds
  const graph: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(existingAdjacency)) {
    if (k !== topicId) {
      graph[k] = [...v];
    }
  }
  graph[topicId] = [...proposedPrereqIds];

  // Run cycle detection across the entire graph
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycleDFS(node: string): boolean {
    visited.add(node);
    recStack.add(node);

    for (const neighbor of graph[node] || []) {
      if (!visited.has(neighbor)) {
        if (hasCycleDFS(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      if (hasCycleDFS(node)) {
        return {
          valid: false,
          error: 'This selection would create a circular prerequisite path. Remove one of the conflicting relationships and try again.',
        };
      }
    }
  }

  return { valid: true };
}
