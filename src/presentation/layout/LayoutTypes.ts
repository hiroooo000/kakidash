export interface NodeLayout {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'left' | 'right';
  isRoot: boolean;
}

export interface ConnectionLayout {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  toNodeId: string;
}

export interface LayoutResult {
  nodes: NodeLayout[];
  connections: ConnectionLayout[];
}
