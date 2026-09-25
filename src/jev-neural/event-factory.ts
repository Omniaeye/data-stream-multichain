/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

import type { Evidence, NeuralEdge, NeuralEvent, NeuralNode, NeuralZone } from './domain';

export type NormalizedField = Readonly<{
  id: string;
  key: string;
  label: string;
  value: string | number | boolean | null;
  zone: NeuralZone;
  path: string;
}>;

export type NormalizedToken = Readonly<{
  id: string;
  name: string;
  chain: NeuralNode['chain'];
  fields: readonly NormalizedField[];
  evidence: Evidence;
}>;

function stableId(...parts: readonly string[]): string {
  return parts.map(part => encodeURIComponent(part)).join(':');
}

function attributeValue(value: NormalizedField['value']): string | number | boolean | null {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : null;
}

export function eventFromToken(token: NormalizedToken, occurredAt = token.evidence.receivedAt): NeuralEvent {
  const tokenNode: NeuralNode = Object.freeze({
    id: `token:${token.chain}:${token.id}`,
    kind: 'token', label: token.name, chain: token.chain, evidence: token.evidence,
    attributes: Object.freeze({ tokenId: token.id })
  });
  const nodes: NeuralNode[] = [tokenNode];
  const edges: NeuralEdge[] = [];
  for (const field of token.fields) {
    const nodeId = stableId('observation', token.chain ?? 'unknown', token.id, field.id);
    nodes.push(Object.freeze({
      id: nodeId, kind: 'observation', label: field.label, chain: token.chain, zone: field.zone,
      evidence: Object.freeze({ ...token.evidence, sourcePath: field.path }),
      attributes: Object.freeze({ key: field.key, value: attributeValue(field.value) })
    }));
    edges.push(Object.freeze({
      id: stableId('captured', tokenNode.id, nodeId), kind: 'captured', from: tokenNode.id, to: nodeId,
      weight: 1, occurredAt, evidence: Object.freeze({ ...token.evidence, sourcePath: field.path })
    }));
  }
  return Object.freeze({ id: stableId('event', token.evidence.captureId, token.id), occurredAt, nodes, edges });
}
