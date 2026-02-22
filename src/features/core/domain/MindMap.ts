import { Node } from './Node';
import { Theme } from './MindMapData';

export class MindMap {
  root: Node;
  theme: Theme = 'default';
  private nodeIndex: Map<string, Node> = new Map();

  constructor(rootNode: Node) {
    this.root = rootNode;
    this.rebuildIndex();
  }

  /**
   * Rebuild the entire node index from the current root tree.
   * Should be called after root replacement (e.g., importData).
   */
  rebuildIndex(): void {
    this.nodeIndex.clear();
    this.indexSubtree(this.root);
  }

  private indexSubtree(node: Node): void {
    this.nodeIndex.set(node.id, node);
    for (const child of node.children) {
      this.indexSubtree(child);
    }
  }

  /**
   * Register a node and its entire subtree into the index.
   * Call after adding a node (or subtree) to the tree.
   */
  registerNode(node: Node): void {
    this.indexSubtree(node);
  }

  /**
   * Unregister a node and its entire subtree from the index.
   * Call after removing a node (or subtree) from the tree.
   */
  unregisterNode(node: Node): void {
    this.removeFromIndex(node);
  }

  private removeFromIndex(node: Node): void {
    this.nodeIndex.delete(node.id);
    for (const child of node.children) {
      this.removeFromIndex(child);
    }
  }

  findNode(id: string): Node | null {
    return this.nodeIndex.get(id) ?? null;
  }

  moveNode(nodeId: string, newParentId: string): boolean {
    const node = this.findNode(nodeId);
    const newParent = this.findNode(newParentId);

    if (!node || !newParent) return false;
    if (node.isRoot) return false; // Cannot move root
    if (node.parentId === newParentId) return false; // Already there

    // Cycle detection: cannot move to a descendant
    if (this.isDescendant(node, newParentId)) return false;

    // Remove from old parent
    if (node.parentId) {
      const oldParent = this.findNode(node.parentId);
      if (oldParent) {
        oldParent.removeChild(nodeId);
      }
    }

    // Add to new parent (index already has the node, no re-register needed)
    newParent.addChild(node);
    return true;
  }

  addSibling(referenceId: string, newNode: Node, position: 'before' | 'after'): boolean {
    const referenceNode = this.findNode(referenceId);
    if (!referenceNode || !referenceNode.parentId) return false; // Root has no siblings

    const parent = this.findNode(referenceNode.parentId);
    if (!parent) return false;

    const index = parent.children.findIndex((child) => child.id === referenceId);
    if (index === -1) return false;

    const insertIndex = position === 'before' ? index : index + 1;
    parent.insertChild(newNode, insertIndex);

    // Register new node in index
    this.registerNode(newNode);
    return true;
  }

  insertParent(targetId: string, newParentNode: Node): boolean {
    const targetNode = this.findNode(targetId);
    if (!targetNode || !targetNode.parentId) return false; // Cannot insert parent for root

    const currentParent = this.findNode(targetNode.parentId);
    if (!currentParent) return false;

    // 1. Determine the index of the target node in the current parent
    const index = currentParent.children.findIndex((c) => c.id === targetId);
    if (index === -1) return false;

    // 2. Remove target node from current parent
    currentParent.removeChild(targetId);

    // 3. Insert the new parent node at the same position
    currentParent.insertChild(newParentNode, index);

    // 4. Add the target node as a child of the new parent
    newParentNode.addChild(targetNode);

    // Register new parent node in index
    this.registerNode(newParentNode);
    return true;
  }

  private isDescendant(ancestor: Node, targetId: string): boolean {
    if (ancestor.id === targetId) return true;
    for (const child of ancestor.children) {
      if (this.isDescendant(child, targetId)) return true;
    }
    return false;
  }
}
