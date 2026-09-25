/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

import type { NeuralZone } from './domain';
import type { NeuralProjection } from './projection';

export type NeuralTopology = Readonly<{
  regions: readonly { zone: NeuralZone; center: readonly [number, number, number]; radius: number }[];
  synapses: readonly { from: string; to: string; intensity: number }[];
}>;

const REGION_ORDER: readonly NeuralZone[] = ['market', 'holders', 'risk', 'lifecycle', 'social'];

export function buildTopology(nodes: readonly NeuralProjection[], links: readonly { edgeId: string; from: NeuralProjection; to: NeuralProjection; weight: number }[]): NeuralTopology {
  const regions = REGION_ORDER.map(zone => {
    const members = nodes.filter(node => node.zone === zone);
    const sum = members.reduce<[number, number, number]>((acc, node) => [acc[0] + node.position[0], acc[1] + node.position[1], acc[2] + node.position[2]], [0, 0, 0]);
    const center: readonly [number, number, number] = members.length ? [sum[0] / members.length, sum[1] / members.length, sum[2] / members.length] : [0, 0, 0];
    return Object.freeze({ zone, center, radius: Math.max(0.18, Math.sqrt(members.length || 1) * 0.12) });
  });
  return Object.freeze({
    regions,
    synapses: links.map(link => Object.freeze({ from: link.from.nodeId, to: link.to.nodeId, intensity: Math.min(1, link.weight * (link.from.activation + link.to.activation + 0.15)) }))
  });
}
