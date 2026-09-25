/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

import type { Evidence, NeuralEdge, NeuralNode } from './domain';

function required(value: string, field: string): void {
  if (!value.trim()) throw new Error(`Missing ${field}`);
}

export function assertEvidence(evidence: Evidence): void {
  required(evidence.captureId, 'captureId');
  required(evidence.captureHash, 'captureHash');
  required(evidence.sourcePath, 'sourcePath');
  if (!Number.isFinite(Date.parse(evidence.receivedAt))) throw new Error('Invalid receivedAt');
}

export function assertNode(node: NeuralNode): void {
  required(node.id, 'node.id');
  required(node.label, 'node.label');
  assertEvidence(node.evidence);
}

export function assertEdge(edge: NeuralEdge, nodes: ReadonlyMap<string, NeuralNode>): void {
  required(edge.id, 'edge.id');
  if (!nodes.has(edge.from) || !nodes.has(edge.to)) throw new Error(`Edge ${edge.id} has an unknown endpoint`);
  if (!Number.isFinite(edge.weight) || edge.weight < 0 || edge.weight > 1) throw new Error(`Edge ${edge.id} has invalid weight`);
  if (!Number.isFinite(Date.parse(edge.occurredAt))) throw new Error(`Edge ${edge.id} has invalid occurredAt`);
  assertEvidence(edge.evidence);
}

export function sameEvidence(left: Evidence, right: Evidence): boolean {
  return left.captureId === right.captureId && left.captureHash === right.captureHash;
}
