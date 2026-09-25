/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

import type { NeuralEdge, NeuralNode } from './domain';
import type { GraphSnapshot } from './graph';

export type EvidenceTrail = Readonly<{
  nodeIds: readonly string[];
  edgeIds: readonly string[];
  captureIds: readonly string[];
}>;

export function findNodes(snapshot: GraphSnapshot, predicate: (node: NeuralNode) => boolean): readonly NeuralNode[] {
  return snapshot.nodes.filter(predicate);
}

export function strongestEdges(snapshot: GraphSnapshot, limit = 20): readonly NeuralEdge[] {
  return [...snapshot.edges].sort((left, right) => right.weight - left.weight || right.occurredAt.localeCompare(left.occurredAt)).slice(0, Math.max(0, limit));
}

export function evidenceTrail(snapshot: GraphSnapshot, edgeIds: readonly string[]): EvidenceTrail {
  const edges = new Map(snapshot.edges.map(edge => [edge.id, edge]));
  const selected = edgeIds.map(id => edges.get(id)).filter((edge): edge is NeuralEdge => !!edge);
  return Object.freeze({
    nodeIds: [...new Set(selected.flatMap(edge => [edge.from, edge.to]))],
    edgeIds: selected.map(edge => edge.id),
    captureIds: [...new Set(selected.map(edge => edge.evidence.captureId))]
  });
}

export function activeCommunities(snapshot: GraphSnapshot, floor = 0.05): readonly (readonly string[])[] {
  const active = new Set(snapshot.activity.filter(item => item.activation >= floor).map(item => item.nodeId));
  const adjacency = new Map<string, Set<string>>();
  for (const edge of snapshot.edges) {
    if (!active.has(edge.from) || !active.has(edge.to)) continue;
    (adjacency.get(edge.from) ?? adjacency.set(edge.from, new Set()).get(edge.from)!).add(edge.to);
    (adjacency.get(edge.to) ?? adjacency.set(edge.to, new Set()).get(edge.to)!).add(edge.from);
  }
  const visited = new Set<string>(), groups: string[][] = [];
  for (const nodeId of active) {
    if (visited.has(nodeId)) continue;
    const queue = [nodeId], group: string[] = [];
    visited.add(nodeId);
    while (queue.length) {
      const current = queue.shift()!;
      group.push(current);
      for (const neighbor of adjacency.get(current) ?? []) if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
    }
    groups.push(group.sort());
  }
  return groups.sort((left, right) => right.length - left.length || left[0].localeCompare(right[0]));
}
