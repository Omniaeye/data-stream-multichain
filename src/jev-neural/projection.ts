/**
 * © 2026 OMNIA EYE Corporation. All Rights Reserved.
 * Proprietary and confidential.
 */

import type { NeuralEdge, NeuralNode, NeuralZone } from './domain';
import type { GraphSnapshot } from './graph';

export type NeuralProjection = Readonly<{
  nodeId: string;
  zone: NeuralZone;
  activation: number;
  position: readonly [number, number, number];
}>;

const ZONES: Record<NeuralZone, readonly [number, number, number]> = {
  market: [-0.62, 0.56, 0.45], holders: [0.62, 0.56, 0.35], risk: [-0.68, -0.36, 0.40], lifecycle: [0.68, -0.36, 0.40], social: [0, 0.08, 0.70]
};

function zoneFor(node: NeuralNode): NeuralZone {
  return node.zone ?? 'lifecycle';
}

function jitter(id: string, dimension: number): number {
  let hash = 2166136261;
  for (const character of `${id}:${dimension}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return ((hash >>> 0) / 4_294_967_295 - 0.5) * 0.42;
}

export function projectGraph(snapshot: GraphSnapshot): readonly NeuralProjection[] {
  const activity = new Map(snapshot.activity.map(item => [item.nodeId, item.activation]));
  return snapshot.nodes.map(node => {
    const zone = zoneFor(node), center = ZONES[zone];
    return Object.freeze({
      nodeId: node.id,
      zone,
      activation: activity.get(node.id) ?? 0,
      position: [center[0] + jitter(node.id, 0), center[1] + jitter(node.id, 1), center[2] + jitter(node.id, 2)] as const
    });
  });
}

export function projectEdges(edges: readonly NeuralEdge[], nodes: readonly NeuralProjection[]): readonly { edgeId: string; from: NeuralProjection; to: NeuralProjection; weight: number }[] {
  const byId = new Map(nodes.map(node => [node.nodeId, node]));
  return edges.flatMap(edge => {
    const from = byId.get(edge.from), to = byId.get(edge.to);
    return from && to ? [Object.freeze({ edgeId: edge.id, from, to, weight: edge.weight })] : [];
  });
}
