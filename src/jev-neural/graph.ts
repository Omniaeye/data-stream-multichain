/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

import type { NeuralEdge, NeuralEvent, NeuralNode } from './domain';
import { assertEdge, assertNode } from './evidence';
import { TemporalMemory, type TemporalState } from './temporal-memory';

export type GraphSnapshot = Readonly<{
  nodes: readonly NeuralNode[];
  edges: readonly NeuralEdge[];
  activity: readonly TemporalState[];
}>;

export class JEVNeuralGraph {
  #nodes = new Map<string, NeuralNode>();
  #edges = new Map<string, NeuralEdge>();
  #adjacency = new Map<string, Set<string>>();
  #memory = new TemporalMemory();

  ingest(event: NeuralEvent): GraphSnapshot {
    if (!Number.isFinite(Date.parse(event.occurredAt))) throw new Error('Invalid event time');
    const staged = new Map(this.#nodes);
    for (const node of event.nodes) {
      assertNode(node);
      const existing = staged.get(node.id);
      if (existing && existing.evidence.captureHash !== node.evidence.captureHash) throw new Error(`Conflicting node ${node.id}`);
      staged.set(node.id, Object.freeze({ ...node }));
    }
    for (const edge of event.edges) assertEdge(edge, staged);
    for (const node of event.nodes) {
      this.#nodes.set(node.id, Object.freeze({ ...node }));
      this.#memory.observe(node, event.occurredAt);
    }
    for (const edge of event.edges) {
      const existing = this.#edges.get(edge.id);
      if (existing && existing.evidence.captureHash !== edge.evidence.captureHash) throw new Error(`Conflicting edge ${edge.id}`);
      this.#edges.set(edge.id, Object.freeze({ ...edge }));
      this.link(edge.from, edge.id);
      this.link(edge.to, edge.id);
      this.#memory.propagate(edge, this.#nodes);
    }
    return this.snapshot(event.occurredAt);
  }

  neighbors(nodeId: string): readonly NeuralNode[] {
    const edgeIds = this.#adjacency.get(nodeId) ?? new Set<string>();
    const result = new Map<string, NeuralNode>();
    for (const edgeId of edgeIds) {
      const edge = this.#edges.get(edgeId);
      if (!edge) continue;
      const neighborId = edge.from === nodeId ? edge.to : edge.from;
      const node = this.#nodes.get(neighborId);
      if (node) result.set(node.id, node);
    }
    return [...result.values()];
  }

  path(from: string, to: string, maxDepth = 5): readonly NeuralEdge[] {
    if (from === to) return [];
    const queue: Array<{ nodeId: string; edges: NeuralEdge[] }> = [{ nodeId: from, edges: [] }];
    const visited = new Set([from]);
    while (queue.length) {
      const current = queue.shift()!;
      if (current.edges.length >= maxDepth) continue;
      for (const edgeId of this.#adjacency.get(current.nodeId) ?? []) {
        const edge = this.#edges.get(edgeId);
        if (!edge) continue;
        const next = edge.from === current.nodeId ? edge.to : edge.from;
        if (visited.has(next)) continue;
        const route = [...current.edges, edge];
        if (next === to) return route;
        visited.add(next);
        queue.push({ nodeId: next, edges: route });
      }
    }
    return [];
  }

  snapshot(at = new Date().toISOString()): GraphSnapshot {
    return Object.freeze({
      nodes: [...this.#nodes.values()],
      edges: [...this.#edges.values()],
      activity: this.#memory.snapshot(at)
    });
  }

  private link(nodeId: string, edgeId: string): void {
    const edges = this.#adjacency.get(nodeId) ?? new Set<string>();
    edges.add(edgeId);
    this.#adjacency.set(nodeId, edges);
  }
}
