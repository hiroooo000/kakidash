import { MindMap } from '../../features/core/domain/MindMap';
import { LayoutMode } from '../../features/core/domain/LayoutMode';
import { Node } from '../../features/core/domain/Node';

export interface Renderer {
  container: HTMLElement;
  maxWidth: number;
  render(mindMap: MindMap, selectedNodeId?: string | null, layoutMode?: LayoutMode): void;
  updateTransform(x: number, y: number, scale: number): void;
  measureNode(node: Node, mindMap?: MindMap): { width: number; height: number };
}
