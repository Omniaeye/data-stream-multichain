/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

export type Chain = 'robinhood' | 'bsc' | 'solana';
export type NodeKind = 'token' | 'observation' | 'source' | 'social_profile' | 'narrative';
export type EdgeKind = 'captured' | 'mentions' | 'links' | 'shares' | 'belongs_to';
export type NeuralZone = 'market' | 'holders' | 'risk' | 'lifecycle' | 'social';

export type Evidence = Readonly<{
  captureId: string;
  captureHash: string;
  receivedAt: string;
  sourcePath: string;
  sourceUrl?: string;
}>;

export type NeuralNode = Readonly<{
  id: string;
  kind: NodeKind;
  label: string;
  chain?: Chain;
  zone?: NeuralZone;
  evidence: Evidence;
  attributes: Readonly<Record<string, string | number | boolean | null>>;
}>;

export type NeuralEdge = Readonly<{
  id: string;
  kind: EdgeKind;
  from: string;
  to: string;
  weight: number;
  occurredAt: string;
  evidence: Evidence;
}>;

export type NeuralEvent = Readonly<{
  id: string;
  occurredAt: string;
  nodes: readonly NeuralNode[];
  edges: readonly NeuralEdge[];
}>;

export type NeuralRead = Readonly<{
  status: 'observe' | 'review' | 'insufficient';
  themes: readonly string[];
  evidenceIds: readonly string[];
  rationale: string;
  model: string;
  modelVersion: string;
  evaluatedAt: string;
}>;
