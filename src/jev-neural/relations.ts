/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

import type { Evidence, NeuralEdge, NeuralNode } from './domain';

export type RelationDraft = Readonly<{
  kind: NeuralEdge['kind'];
  from: NeuralNode;
  to: NeuralNode;
  evidence: Evidence;
  occurredAt: string;
  weight?: number;
}>;

export function relationId(draft: RelationDraft): string {
  return `${draft.kind}:${encodeURIComponent(draft.from.id)}:${encodeURIComponent(draft.to.id)}:${encodeURIComponent(draft.evidence.captureId)}:${encodeURIComponent(draft.evidence.sourcePath)}`;
}

export function createRelation(draft: RelationDraft): NeuralEdge {
  const weight = draft.weight ?? 1;
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new Error('Relation weight must be between zero and one');
  return Object.freeze({ id: relationId(draft), kind: draft.kind, from: draft.from.id, to: draft.to.id, weight, occurredAt: draft.occurredAt, evidence: draft.evidence });
}

export function linkBySharedAttribute(nodes: readonly NeuralNode[], key: string, evidence: Evidence, occurredAt: string): readonly NeuralEdge[] {
  const groups = new Map<string, NeuralNode[]>();
  for (const node of nodes) {
    const value = node.attributes[key];
    if (typeof value !== 'string' || !value.trim()) continue;
    const collection = groups.get(value) ?? [];
    collection.push(node);
    groups.set(value, collection);
  }
  const edges: NeuralEdge[] = [];
  for (const [value, group] of groups) {
    for (let index = 1; index < group.length; index += 1) {
      const from = group[index - 1], to = group[index];
      edges.push(createRelation({ kind: 'shares', from, to, evidence: { ...evidence, sourcePath: `${evidence.sourcePath}.${key}.${value}` }, occurredAt, weight: 0.7 }));
    }
  }
  return edges;
}
