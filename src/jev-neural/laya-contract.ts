/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

import type { NeuralRead } from './domain';
import type { GraphSnapshot } from './graph';

export type LayaEvidencePacket = Readonly<{
  schema: 'omnia.jev.laya-context.v1';
  requestedAt: string;
  subjectId: string;
  nodes: readonly { id: string; kind: string; label: string; attributes: Readonly<Record<string, string | number | boolean | null>> }[];
  edges: readonly { id: string; kind: string; from: string; to: string; evidenceId: string }[];
  evidence: readonly { id: string; captureId: string; captureHash: string; receivedAt: string; sourcePath: string; sourceUrl?: string }[];
}>;

export function buildLayaEvidencePacket(snapshot: GraphSnapshot, subjectId: string, requestedAt = new Date().toISOString()): LayaEvidencePacket {
  const included = new Set<string>([subjectId]);
  for (const edge of snapshot.edges) if (edge.from === subjectId || edge.to === subjectId) { included.add(edge.from); included.add(edge.to); }
  const nodes = snapshot.nodes.filter(node => included.has(node.id));
  const edges = snapshot.edges.filter(edge => included.has(edge.from) && included.has(edge.to));
  const evidence = new Map<string, LayaEvidencePacket['evidence'][number]>();
  for (const item of [...nodes.map(node => node.evidence), ...edges.map(edge => edge.evidence)]) {
    const id = `${item.captureId}:${item.sourcePath}`;
    evidence.set(id, { id, captureId: item.captureId, captureHash: item.captureHash, receivedAt: item.receivedAt, sourcePath: item.sourcePath, sourceUrl: item.sourceUrl });
  }
  return Object.freeze({
    schema: 'omnia.jev.laya-context.v1', requestedAt, subjectId,
    nodes: nodes.map(node => ({ id: node.id, kind: node.kind, label: node.label, attributes: node.attributes })),
    edges: edges.map(edge => ({ id: edge.id, kind: edge.kind, from: edge.from, to: edge.to, evidenceId: `${edge.evidence.captureId}:${edge.evidence.sourcePath}` })),
    evidence: [...evidence.values()]
  });
}

export function assertLayaRead(value: NeuralRead, packet: LayaEvidencePacket): NeuralRead {
  if (!['observe', 'review', 'insufficient'].includes(value.status)) throw new Error('Invalid Laya status');
  if (!value.model || !value.modelVersion || !Number.isFinite(Date.parse(value.evaluatedAt))) throw new Error('Invalid Laya model metadata');
  const available = new Set(packet.evidence.map(item => item.id));
  if (value.evidenceIds.some(id => !available.has(id))) throw new Error('Laya read cites unknown evidence');
  return Object.freeze({ ...value, themes: [...new Set(value.themes)].slice(0, 12), evidenceIds: [...new Set(value.evidenceIds)] });
}
