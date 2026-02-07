import { MindMap } from '../../domain/entities/MindMap';
import { LayoutMode } from '../../domain/interfaces/LayoutMode';
import { Node } from '../../domain/entities/Node';

export interface Renderer {
  container: HTMLElement;
  maxWidth: number;
  render(mindMap: MindMap, selectedNodeId?: string | null, layoutMode?: LayoutMode): void;
  updateTransform(x: number, y: number, scale: number): void;
  measureNode(node: Node, mindMap?: MindMap): { width: number; height: number };
}
