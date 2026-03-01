import { Node } from '../../features/core/domain/Node';
import { LayoutResult } from './LayoutTypes';

export type LayoutMode = 'Right' | 'Left' | 'Both';

export class LayoutEngine {
  private measureFn: (node: Node) => { width: number; height: number };
  private heightCache = new Map<string, number>();

  constructor(measureFn: (node: Node) => { width: number; height: number }) {
    this.measureFn = measureFn;
  }

  public calculate(root: Node, layoutMode: LayoutMode): LayoutResult {
    this.heightCache.clear();
    const result: LayoutResult = { nodes: [], connections: [] };

    const { width: rootWidth, height: rootHeight } = this.measureNode(root);

    result.nodes.push({
      nodeId: root.id,
      x: 0,
      y: 0,
      width: rootWidth,
      height: rootHeight,
      direction: 'right', // Default direction for the root node itself
      isRoot: true,
    });

    if (root.presentation?.isFolded || root.children.length === 0) {
      return result;
    }

    let rightChildren: Node[] = [];
    let leftChildren: Node[] = [];

    if (layoutMode === 'Both') {
      root.children.forEach((child, index) => {
        const side = child.presentation?.layoutSide || (index % 2 === 0 ? 'right' : 'left');
        if (side === 'right') rightChildren.push(child);
        else leftChildren.push(child);
      });
    } else if (layoutMode === 'Left') {
      leftChildren = root.children;
    } else {
      rightChildren = root.children;
    }

    if (rightChildren.length > 0) {
      this.calculateChildrenStack(
        root,
        rightChildren,
        0,
        0,
        layoutMode,
        'right',
        rootWidth,
        result,
      );
    }

    if (leftChildren.length > 0) {
      this.calculateChildrenStack(root, leftChildren, 0, 0, layoutMode, 'left', rootWidth, result);
    }

    return result;
  }

  private calculateChildrenStack(
    parentNode: Node,
    children: Node[],
    parentX: number,
    parentY: number,
    layoutMode: LayoutMode,
    direction: 'left' | 'right',
    parentWidth: number,
    result: LayoutResult,
  ): void {
    const totalHeight = children.reduce((acc, child) => acc + this.getNodeHeight(child), 0);
    let startY = parentY - totalHeight / 2;

    const levelGap = 80;

    let parentEdgeX = 0;
    if (parentNode.isRoot) {
      parentEdgeX = direction === 'right' ? parentX + parentWidth / 2 : parentX - parentWidth / 2;
    } else {
      if (direction === 'right') {
        parentEdgeX = parentX + parentWidth;
      } else {
        parentEdgeX = parentX - parentWidth;
      }
    }

    children.forEach((child) => {
      const childHeight = this.getNodeHeight(child);
      const childY = startY + childHeight / 2;

      const childX = direction === 'right' ? parentEdgeX + levelGap : parentEdgeX - levelGap;

      const { width: childWidth, height: childRenderHeight } = this.measureNode(child);

      result.nodes.push({
        nodeId: child.id,
        x: childX,
        y: childY,
        width: childWidth,
        height: childRenderHeight,
        direction,
        isRoot: false,
      });

      result.connections.push({
        fromX: parentEdgeX,
        fromY: parentY,
        toX: childX,
        toY: childY,
        toNodeId: child.id,
      });

      if (!child.presentation?.isFolded && child.children.length > 0) {
        const childDir: 'left' | 'right' = direction;
        let rightChildren: Node[] = [];
        let leftChildren: Node[] = [];

        if (childDir === 'left') leftChildren = child.children;
        else rightChildren = child.children;

        if (rightChildren.length > 0) {
          this.calculateChildrenStack(
            child,
            rightChildren,
            childX,
            childY,
            layoutMode,
            'right',
            childWidth,
            result,
          );
        }

        if (leftChildren.length > 0) {
          this.calculateChildrenStack(
            child,
            leftChildren,
            childX,
            childY,
            layoutMode,
            'left',
            childWidth,
            result,
          );
        }
      }

      startY += childHeight;
    });
  }

  private getChildrenHeight(node: Node): number {
    return node.children.reduce((acc, child) => acc + this.getNodeHeight(child), 0);
  }

  private getNodeHeight(node: Node): number {
    if (this.heightCache.has(node.id)) {
      return this.heightCache.get(node.id)!;
    }

    const { height } = this.measureNode(node);
    const verticalGap = 20;

    if (node.children.length === 0 || node.presentation?.isFolded) {
      const result = height + verticalGap;
      this.heightCache.set(node.id, result);
      return result;
    }

    const childrenTotalHeight = this.getChildrenHeight(node);
    const result = Math.max(height + verticalGap, childrenTotalHeight);
    this.heightCache.set(node.id, result);
    return result;
  }

  private measureNode(node: Node): { width: number; height: number } {
    return this.measureFn(node);
  }
}
