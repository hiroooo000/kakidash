import { MindMap } from '../../features/core/domain/MindMap';
import { LayoutMode } from '../../features/core/domain/LayoutMode';
import { Node } from '../../features/core/domain/Node';

export interface Renderer {
  container: HTMLElement;
  maxWidth: number;
  render(
    mindMap: MindMap,
    selectedNodeIds?: Set<string> | string[] | string | null,
    layoutMode?: LayoutMode,
  ): void;
  updateTransform(x: number, y: number, scale: number): void;
  measureNode(node: Node, mindMap?: MindMap): { width: number; height: number };
  updateSelection(selectedNodeIds: Set<string>): void;
}
