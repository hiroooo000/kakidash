import { MindMap } from '../../features/core/domain/MindMap';
import { LayoutMode } from '../../features/core/domain/LayoutMode';
import { Node } from '../../features/core/domain/Node';
import { LayoutResult } from '../layout/LayoutTypes';

export interface Renderer {
  container: HTMLElement;
  maxWidth: number;
  renderFromLayout(
    layout: LayoutResult,
    mindMap: MindMap,
    selectedNodeIds: Set<string>,
    layoutMode: LayoutMode,
  ): void;
  updateTransform(x: number, y: number, scale: number): void;
  measureNode(node: Node, mindMap?: MindMap): { width: number; height: number };
  updateSelection(selectedNodeIds: Set<string>): void;
}
