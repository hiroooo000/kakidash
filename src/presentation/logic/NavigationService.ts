import { MindMap } from '../../features/core/domain/MindMap';
import { Node } from '../../features/core/domain/Node';
import { type LayoutMode } from '../../features/core/domain/LayoutMode';
import { type Direction } from '../../presentation/types/InteractionOptions';

/**
 * Handles navigation logic (keyboard arrow navigation) within the mind map.
 * Extracted from MindMapController to follow Single Responsibility Principle.
 */
export class NavigationService {
  private mindMap: MindMap;
  private layoutMode: LayoutMode = 'Right';

  constructor(mindMap: MindMap) {
    this.mindMap = mindMap;
  }

  /** Set current layout mode */
  setLayoutMode(mode: LayoutMode): void {
    this.layoutMode = mode;
  }

  /** Get current layout mode */
  getLayoutMode(): LayoutMode {
    return this.layoutMode;
  }

  /**
   * Navigate from a node in the given direction.
   * Returns the target node ID, or undefined if navigation is not possible.
   */
  navigate(nodeId: string, direction: Direction): string | undefined {
    const node = this.mindMap.findNode(nodeId);
    if (!node) return undefined;

    switch (direction) {
      case 'Left':
        return this.navigateLeft(node);
      case 'Right':
        return this.navigateRight(node);
      case 'Up':
        return this.navigateUp(node);
      case 'Down':
        return this.navigateDown(node);
    }
  }

  /** Get the directional side of a node (left or right) */
  getNodeDirection(node: Node): 'left' | 'right' {
    if (node.isRoot) return 'right';
    if (this.layoutMode === 'Right') return 'right';
    if (this.layoutMode === 'Left') return 'left';

    let current = node;
    while (current.parentId) {
      const parent = this.mindMap.findNode(current.parentId);
      if (!parent) break;
      if (parent.isRoot) {
        if (current.presentation.layoutSide) return current.presentation.layoutSide;
        const index = parent.children.findIndex((c: Node) => c.id === current.id);
        return index % 2 === 0 ? 'right' : 'left';
      }
      current = parent;
    }
    return 'right';
  }

  /** Ensure all root children have explicit layout sides in Both mode */
  ensureExplicitLayoutSides(parent: Node): void {
    if (!parent.isRoot || this.layoutMode !== 'Both') return;
    parent.children.forEach((child: Node, index: number) => {
      if (!child.presentation.layoutSide) {
        child.presentation.layoutSide = index % 2 === 0 ? 'right' : 'left';
      }
    });
  }

  private navigateLeft(node: Node): string | undefined {
    if (node.isRoot) {
      if (this.layoutMode === 'Left')
        return node.children.length > 0 ? node.children[0].id : undefined;
      if (this.layoutMode === 'Both') {
        const target = node.children.find(
          (c, i) => (c.presentation.layoutSide || (i % 2 !== 0 ? 'left' : 'right')) === 'left',
        );
        return target ? target.id : undefined;
      }
    } else if (node.parentId) {
      const dir = this.getNodeDirection(node);
      if (dir === 'right') return node.parentId;
      return node.children.length > 0 ? node.children[0].id : undefined;
    }
  }

  private navigateRight(node: Node): string | undefined {
    if (node.isRoot) {
      if (this.layoutMode === 'Right')
        return node.children.length > 0 ? node.children[0].id : undefined;
      if (this.layoutMode === 'Both') {
        const target = node.children.find(
          (c, i) => (c.presentation.layoutSide || (i % 2 === 0 ? 'right' : 'left')) === 'right',
        );
        return target ? target.id : undefined;
      }
    } else if (node.parentId) {
      const dir = this.getNodeDirection(node);
      if (dir === 'right') return node.children.length > 0 ? node.children[0].id : undefined;
      return node.parentId;
    }
  }

  private navigateUp(node: Node): string | undefined {
    if (node.parentId) {
      const parent = this.mindMap.findNode(node.parentId);
      if (parent) {
        const myDir = this.getNodeDirection(node);
        const sameSide = parent.children.filter((c) => this.getNodeDirection(c) === myDir);
        const idx = sameSide.findIndex((c) => c.id === node.id);
        if (idx > 0) return sameSide[idx - 1].id;
      }
    }
  }

  private navigateDown(node: Node): string | undefined {
    if (node.parentId) {
      const parent = this.mindMap.findNode(node.parentId);
      if (parent) {
        const myDir = this.getNodeDirection(node);
        const sameSide = parent.children.filter((c) => this.getNodeDirection(c) === myDir);
        const idx = sameSide.findIndex((c) => c.id === node.id);
        if (idx !== -1 && idx < sameSide.length - 1) return sameSide[idx + 1].id;
      }
    }
  }
}
