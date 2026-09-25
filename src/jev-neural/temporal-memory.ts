/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

import type { NeuralEdge, NeuralNode } from './domain';

export type TemporalState = Readonly<{
  nodeId: string;
  activation: number;
  lastObservedAt: string;
  observations: number;
}>;

export class TemporalMemory {
  #states = new Map<string, TemporalState>();

  observe(node: NeuralNode, at: string, signal = 1): TemporalState {
    const timestamp = Date.parse(at);
    if (!Number.isFinite(timestamp)) throw new Error('Invalid observation time');
    if (!Number.isFinite(signal) || signal < 0) throw new Error('Invalid signal');
    const current = this.#states.get(node.id);
    const activation = Math.min(1, this.decay(current, timestamp) + signal);
    const next: TemporalState = Object.freeze({
      nodeId: node.id,
      activation,
      lastObservedAt: new Date(timestamp).toISOString(),
      observations: (current?.observations ?? 0) + 1
    });
    this.#states.set(node.id, next);
    return next;
  }

  propagate(edge: NeuralEdge, nodes: ReadonlyMap<string, NeuralNode>): TemporalState[] {
    const source = nodes.get(edge.from), destination = nodes.get(edge.to);
    if (!source || !destination) throw new Error(`Cannot propagate ${edge.id}`);
    const origin = this.observe(source, edge.occurredAt, edge.weight * 0.35);
    const target = this.observe(destination, edge.occurredAt, edge.weight * Math.max(0.15, origin.activation));
    return [origin, target];
  }

  snapshot(now: string): readonly TemporalState[] {
    const timestamp = Date.parse(now);
    if (!Number.isFinite(timestamp)) throw new Error('Invalid snapshot time');
    return [...this.#states.values()]
      .map(state => Object.freeze({ ...state, activation: this.decay(state, timestamp) }))
      .sort((left, right) => right.activation - left.activation || left.nodeId.localeCompare(right.nodeId));
  }

  private decay(state: TemporalState | undefined, now: number): number {
    if (!state) return 0;
    const elapsedMinutes = Math.max(0, now - Date.parse(state.lastObservedAt)) / 60_000;
    return state.activation * Math.exp(-elapsedMinutes / 30);
  }
}
