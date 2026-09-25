/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

import type { NeuralRead } from './domain';
import type { LayaEvidencePacket } from './laya-contract';

export type ReviewedRead = Readonly<{
  packet: LayaEvidencePacket;
  read: NeuralRead;
  reviewerStatus: NeuralRead['status'];
}>;

export type ReadEvaluation = Readonly<{
  total: number;
  agreement: number;
  evidenceCoverage: number;
  byStatus: Readonly<Record<NeuralRead['status'], number>>;
}>;

export function evaluateReads(items: readonly ReviewedRead[]): ReadEvaluation {
  let agreement = 0, cited = 0, available = 0;
  const byStatus: Record<NeuralRead['status'], number> = { observe: 0, review: 0, insufficient: 0 };
  for (const item of items) {
    byStatus[item.read.status] += 1;
    if (item.read.status === item.reviewerStatus) agreement += 1;
    cited += item.read.evidenceIds.length;
    available += item.packet.evidence.length;
  }
  return Object.freeze({ total: items.length, agreement: items.length ? agreement / items.length : 0, evidenceCoverage: available ? cited / available : 0, byStatus: Object.freeze(byStatus) });
}
