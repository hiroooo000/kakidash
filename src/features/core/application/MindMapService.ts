import { MindMap } from '../domain/MindMap';
import { Node } from '../domain/Node';
import { MindMapData, MindMapNodeData } from '../domain/MindMapData';
import { HistoryManager } from './HistoryManager';
import { IdGenerator } from '../../../shared/kernel/IdGenerator';

export class MindMapService {
  mindMap: MindMap;
  private historyManager: HistoryManager<MindMapData>;
  private idGenerator: IdGenerator;

  constructor(mindMap: MindMap, idGenerator: IdGenerator) {
    this.mindMap = mindMap;
    this.historyManager = new HistoryManager<MindMapData>(10);
    this.idGenerator = idGenerator;
  }

  private saveState(): void {
    this.historyManager.push(this.exportData());
  }

  undo(): boolean {
    const prevState = this.historyManager.undo(this.exportData());
    if (prevState) {
      this.importData(prevState);
      return true;
    }
    return false;
  }

  redo(): boolean {
    const nextState = this.historyManager.redo(this.exportData());
    if (nextState) {
      this.importData(nextState);
      return true;
    }
    return false;
  }

  get canUndo(): boolean {
    return this.historyManager.canUndo;
  }

  get canRedo(): boolean {
    return this.historyManager.canRedo;
  }

  addNode(
    parentId: string,
    topic: string = 'New topic',
    layoutSide?: 'left' | 'right',
  ): Node | null {
    const parent = this.mindMap.findNode(parentId);
    if (!parent) return null;

    this.saveState();

    const id = this.idGenerator.generate();
    const newNode = new Node(id, topic, null, false, undefined, layoutSide, false);
    parent.addChild(newNode);
    return newNode;
  }

  addImageNode(parentId: string, imageData: string, width?: number, height?: number): Node | null {
    const parent = this.mindMap.findNode(parentId);
    if (!parent) return null;

    this.saveState();

    const id = this.idGenerator.generate();
    // Image nodes have empty topic
    const imageSize = width && height ? { width, height } : undefined;
    const newNode = new Node(
      id,
      '',
      parentId,
      false,
      imageData,
      undefined,
      false,
      undefined,
      imageSize,
    );
    parent.addChild(newNode);
    return newNode;
  }

  removeNode(id: string, saveState: boolean = true): boolean {
    const node = this.mindMap.findNode(id);
    if (!node || node.isRoot || !node.parentId) return false;

    const parent = this.mindMap.findNode(node.parentId);
    if (parent) {
      if (saveState) this.saveState();
      parent.removeChild(id);
      return true;
    }
    return false;
  }

  removeNodes(ids: string[]): boolean {
    if (ids.length === 0) return false;

    // Validate all nodes can be removed (not root)
    for (const id of ids) {
      const node = this.mindMap.findNode(id);
      if (!node || node.isRoot) return false;
    }

    this.saveState();

    let removedAny = false;
    // We sort ids to avoid issues? No, just remove them.
    // Finding node logic might be affected if we remove parent then child?
    // User selection typically is siblings.
    // If selection contains parent AND child, removing parent removes child implicitly.
    // We should filter out descendants from the list to avoid double removal attempts?
    // But standard simpler approach: try remove.

    // Better approach: Get all nodes first, then remove.
    // Even better: Filter to keep only top-level nodes in the selection (if A and A.child are selected, remove A).
    // But for now, let's just loop. The findNode will return null if already removed.

    ids.forEach((id) => {
      // Pass false to saveState because we saved once at the start
      if (this.removeNode(id, false)) {
        removedAny = true;
      }
    });

    return removedAny;
  }

  updateNodeTopic(id: string, topic: string): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      this.saveState();
      node.updateTopic(topic);
      return true;
    }
    return false;
  }

  updateNodeStyle(id: string, style: Partial<import('../domain/Node').NodeStyle>): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      this.saveState();
      node.style = { ...node.style, ...style };
      return true;
    }
    return false;
  }

  updateNodesStyle(ids: string[], style: Partial<import('../domain/Node').NodeStyle>): boolean {
    if (ids.length === 0) return false;

    this.saveState();
    let updatedAny = false;

    ids.forEach((id) => {
      const node = this.mindMap.findNode(id);
      if (node) {
        node.style = { ...node.style, ...style };
        updatedAny = true;
      }
    });

    return updatedAny;
  }

  toggleNodeFold(id: string): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      // Prevent folding if no children (but allow unfolding)
      if (node.children.length === 0 && !node.isFolded) {
        return false;
      }

      this.saveState();
      node.isFolded = !node.isFolded;
      return true;
    }
    return false;
  }

  setTheme(theme: import('../domain/MindMapData').Theme): void {
    if (this.mindMap.theme !== theme) {
      this.saveState();
      this.mindMap.theme = theme;
    }
  }

  updateNodeCustomWidth(id: string, width: number | undefined): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      this.saveState();
      node.customWidth = width;
      return true;
    }
    return false;
  }

  moveNode(nodeId: string, newParentId: string, layoutSide?: 'left' | 'right'): boolean {
    // Handle side update for same parent (re-layout)
    const node = this.mindMap.findNode(nodeId);
    if (node && node.parentId === newParentId) {
      if (layoutSide && node.layoutSide !== layoutSide) {
        this.saveState();
        node.layoutSide = layoutSide;
        return true;
      }
      return false; // No change
    }

    // We check validity first roughly, but moveNode does internal checks.
    // Ideally we save state only if move succeeds, but saving before attempt is safer for undo if logic implies we are ABOUT to move.
    // However, if move fails, we added a redundant state.
    // Let's check finding node first to be sure it exists.
    if (!node) return false;

    this.saveState();

    if (this.mindMap.moveNode(nodeId, newParentId)) {
      if (layoutSide) {
        const movedNode = this.mindMap.findNode(nodeId);
        if (movedNode) movedNode.layoutSide = layoutSide;
      }
      return true;
    } else {
      // If move failed, we technically polluted history with an identical state.
      // But undoing it would just restore same state, so not critical.
      // Ideally we pop history, but HistoryManager doesn't expose pop.
      // HistoryManager logic: push current state.
      // If move fails, current state is still same.
      // If user un-does, they go to 'previous' state which is identical.
      // It's fine for now.
    }
    return false;
  }

  addSibling(
    referenceId: string,
    position: 'before' | 'after',
    topic: string = 'New topic',
  ): Node | null {
    const referenceNode = this.mindMap.findNode(referenceId);
    if (!referenceNode || !referenceNode.parentId) return null;

    this.saveState();

    const id = this.idGenerator.generate();
    const newNode = new Node(id, topic);

    if (this.mindMap.addSibling(referenceId, newNode, position)) {
      return newNode;
    }
    return null;
  }

  reorderNode(nodeId: string, targetId: string, position: 'before' | 'after'): boolean {
    const node = this.mindMap.findNode(nodeId);
    const target = this.mindMap.findNode(targetId);

    if (!node || !target || !target.parentId) return false;
    if (node.id === target.id) return false;

    // Cannot reorder root
    if (node.isRoot) return false;

    const parent = this.mindMap.findNode(target.parentId);
    if (!parent) return false;

    this.saveState();

    // Cycle detection if moving to new parent
    if (node.parentId !== parent.id) {
      // Check if parent is descendant of node
      let current = parent;
      while (current.parentId) {
        if (current.id === node.id) return false;
        if (!current.parentId) break;
        const next = this.mindMap.findNode(current.parentId);
        if (!next) break;
        current = next;
      }
    }

    // Remove from old parent if different
    if (node.parentId && node.parentId !== parent.id) {
      const oldParent = this.mindMap.findNode(node.parentId);
      if (oldParent) oldParent.removeChild(node.id);
      node.parentId = parent.id; // Update parent ID immediately so it acts as child
    } else if (node.parentId === parent.id) {
      // Remove from current position to re-insert
      parent.removeChild(node.id);
    }

    // Check if target is still in children? Yes.
    const targetIndex = parent.children.findIndex((c) => c.id === targetId);
    if (targetIndex === -1) {
      // Fallback: append
      parent.addChild(node);
      return true;
    }

    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    parent.insertChild(node, insertIndex);

    // Propagate potential side change if moving under Root
    if (parent.isRoot) {
      // Inherit side from target if possible?
      // If dragging Top/Bottom of a sibling, we generally want to stay on that side.
      // Target has a side.
      if (target.layoutSide) {
        node.layoutSide = target.layoutSide;
      }
    }

    return true;
  }

  insertNodeAsParent(nodeId: string, targetId: string): boolean {
    const node = this.mindMap.findNode(nodeId);
    const target = this.mindMap.findNode(targetId);

    if (!node || !target || !target.parentId) return false; // Cannot insert as parent of Root
    if (node.id === target.id) return false;

    // Cycle check
    const targetParent = this.mindMap.findNode(target.parentId);
    if (!targetParent) return false;

    let current = targetParent;
    while (current) {
      if (current.id === node.id) return false;
      if (!current.parentId) break;
      current = this.mindMap.findNode(current.parentId) as Node;
    }

    this.saveState();

    // Remove node from its old parent
    if (node.parentId) {
      const oldParent = this.mindMap.findNode(node.parentId);
      if (oldParent) oldParent.removeChild(node.id);
    }

    // Insert node into target's parent at target's index
    const index = targetParent.children.findIndex((c) => c.id === targetId);
    if (index === -1) return false;

    // Inherit layoutSide if replacing a node (especially under Root)
    if (targetParent.isRoot && target.layoutSide) {
      node.layoutSide = target.layoutSide;
    }

    targetParent.removeChild(targetId);
    targetParent.insertChild(node, index);
    node.parentId = targetParent.id;

    // Add target as child of node
    node.addChild(target);

    return true;
  }

  insertParent(targetId: string, topic: string = 'New topic'): Node | null {
    const targetNode = this.mindMap.findNode(targetId);
    if (!targetNode || !targetNode.parentId) return null;

    this.saveState();

    const id = this.idGenerator.generate();
    const newParentNode = new Node(id, topic);

    if (this.mindMap.insertParent(targetId, newParentNode)) {
      return newParentNode;
    }
    return null;
  }

  private clipboard: Node[] = [];

  copyNode(nodeId: string): void {
    this.copyNodes([nodeId]);
  }

  copyNodes(nodeIds: string[]): void {
    this.clipboard = [];
    const texts: string[] = [];

    nodeIds.forEach((id) => {
      const node = this.mindMap.findNode(id);
      if (node) {
        this.clipboard.push(this.deepCloneNode(node));
        texts.push(node.topic);
      }
    });

    if (navigator.clipboard && texts.length > 0) {
      navigator.clipboard.writeText(texts.join('\n')).catch((err) => {
        console.error('Failed to write to clipboard', err);
      });
    }
  }

  cutNode(nodeId: string): void {
    this.cutNodes([nodeId]);
  }

  cutNodes(nodeIds: string[]): void {
    this.copyNodes(nodeIds);
    this.removeNodes(nodeIds);
  }

  pasteNode(parentId: string): Node | null {
    const nodes = this.pasteNodes(parentId);
    return nodes.length > 0 ? nodes[0] : null;
  }

  pasteNodes(parentId: string): Node[] {
    if (this.clipboard.length === 0) return [];

    const parent = this.mindMap.findNode(parentId);
    if (!parent) return [];

    this.saveState();

    const newNodes: Node[] = [];

    this.clipboard.forEach((clipNode) => {
      // Clone again from clipboard to create new instance for the tree
      const newNode = this.deepCloneNode(clipNode);
      // Regenerate IDs for the new node and its children
      this.regenerateIds(newNode);

      parent.addChild(newNode);
      newNodes.push(newNode);
    });

    return newNodes;
  }

  private deepCloneNode(node: Node): Node {
    const clone = new Node(
      node.id,
      node.topic,
      null,
      false,
      node.image,
      node.layoutSide,
      node.isFolded,
      node.icon,
      node.imageSize && { ...node.imageSize },
    );
    clone.style = { ...node.style };
    // Determine how to handle children. Recursively clone them.
    clone.children = node.children.map((child) => this.deepCloneNode(child));
    // Fix parent relations for children after cloning
    clone.children.forEach((child) => (child.parentId = clone.id));
    return clone;
  }

  updateNodeIcon(id: string, icon: string): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      this.saveState();
      if (icon === 'delete') {
        node.icon = undefined;
      } else {
        node.icon = icon;
      }
      return true;
    }
    return false;
  }

  private regenerateIds(node: Node): void {
    node.id = this.idGenerator.generate();
    node.children.forEach((child) => {
      child.parentId = node.id;
      this.regenerateIds(child);
    });
  }

  exportData(): MindMapData {
    const buildNodeData = (node: Node): MindMapNodeData => {
      const data: MindMapNodeData = {
        id: node.id,
        topic: node.topic,
        root: node.isRoot || undefined,
        children: node.children.length > 0 ? node.children.map(buildNodeData) : undefined,
        style: Object.keys(node.style).length > 0 ? node.style : undefined,
        image: node.image,
        layoutSide: node.layoutSide,
        isFolded: node.isFolded,

        icon: node.icon,
        imageSize: node.imageSize,
        customWidth: node.customWidth,
      };
      return data;
    };

    return {
      nodeData: buildNodeData(this.mindMap.root),
      theme: this.mindMap.theme,
    };
  }

  searchNodes(query: string): Node[] {
    if (!query) return [];
    const results: Node[] = [];
    const lowerQuery = query.toLowerCase();

    const traverse = (node: Node) => {
      if (node.topic.toLowerCase().includes(lowerQuery)) {
        results.push(node);
      }
      node.children.forEach(traverse);
    };

    traverse(this.mindMap.root);
    return results;
  }

  importData(data: MindMapData): void {
    const buildNodeFromData = (data: MindMapNodeData, parentId: string | null = null): Node => {
      const isRoot = !!data.root;
      const node = new Node(
        data.id,
        data.topic,
        parentId,
        isRoot,
        data.image,
        data.layoutSide,
        data.isFolded || false,
        data.icon,
        data.imageSize,
        data.customWidth,
      );

      if (data.style) {
        node.style = { ...data.style };
      }

      if (data.children && data.children.length > 0) {
        data.children.forEach((childData) => {
          const childNode = buildNodeFromData(childData, node.id);
          node.addChild(childNode);
        });
      }

      return node;
    };

    this.mindMap.root = buildNodeFromData(data.nodeData);
    if (data.theme) {
      this.mindMap.theme = data.theme;
    }
  }
}
