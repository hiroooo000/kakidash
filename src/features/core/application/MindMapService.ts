import { MindMap } from '../domain/MindMap';
import { Node } from '../domain/Node';
import { MindMapData, MindMapNodeData } from '../domain/MindMapData';
import { IdGenerator } from '../../../shared/kernel/IdGenerator';

export class MindMapService {
  mindMap: MindMap;
  private idGenerator: IdGenerator;

  constructor(mindMap: MindMap, idGenerator: IdGenerator) {
    this.mindMap = mindMap;
    this.idGenerator = idGenerator;
  }

  addNode(
    parentId: string,
    topic: string = 'New topic',
    layoutSide?: 'left' | 'right',
  ): Node | null {
    const parent = this.mindMap.findNode(parentId);
    if (!parent) return null;

    const id = this.idGenerator.generate();
    const newNode = new Node(id, topic, null, false, undefined, layoutSide, false);
    parent.addChild(newNode);
    this.mindMap.registerNode(newNode);
    return newNode;
  }

  addImageNode(parentId: string, imageData: string, width?: number, height?: number): Node | null {
    const parent = this.mindMap.findNode(parentId);
    if (!parent) return null;

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
    this.mindMap.registerNode(newNode);
    return newNode;
  }

  removeNode(id: string): boolean {
    const node = this.mindMap.findNode(id);
    if (!node || node.isRoot || !node.parentId) return false;

    const parent = this.mindMap.findNode(node.parentId);
    if (parent) {
      parent.removeChild(id);
      this.mindMap.unregisterNode(node);
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
      if (this.removeNode(id)) {
        removedAny = true;
      }
    });

    return removedAny;
  }

  updateNodeTopic(id: string, topic: string): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      node.updateTopic(topic);
      return true;
    }
    return false;
  }

  updateNodeStyle(id: string, style: Partial<import('../domain/Node').NodeStyle>): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      node.style = { ...node.style, ...style };
      return true;
    }
    return false;
  }

  updateNodesStyle(ids: string[], style: Partial<import('../domain/Node').NodeStyle>): boolean {
    if (ids.length === 0) return false;

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
      if (node.children.length === 0 && !node.presentation.isFolded) {
        return false;
      }

      node.presentation.isFolded = !node.presentation.isFolded;
      return true;
    }
    return false;
  }

  setTheme(theme: import('../domain/MindMapData').Theme): void {
    if (this.mindMap.theme !== theme) {
      this.mindMap.theme = theme;
    }
  }

  updateNodeCustomWidth(id: string, width: number | undefined): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      node.presentation.customWidth = width;
      return true;
    }
    return false;
  }

  moveNode(nodeId: string, newParentId: string, layoutSide?: 'left' | 'right'): boolean {
    // Handle side update for same parent (re-layout)
    const node = this.mindMap.findNode(nodeId);
    if (node && node.parentId === newParentId) {
      if (layoutSide && node.presentation.layoutSide !== layoutSide) {
        node.presentation.layoutSide = layoutSide;
        return true;
      }
      return false; // No change
    }

    // We check validity first roughly, but moveNode does internal checks.
    // Ideally we save state only if move succeeds, but saving before attempt is safer for undo if logic implies we are ABOUT to move.
    // However, if move fails, we added a redundant state.
    // Let's check finding node first to be sure it exists.
    if (!node) return false;

    if (this.mindMap.moveNode(nodeId, newParentId)) {
      if (layoutSide) {
        const movedNode = this.mindMap.findNode(nodeId);
        if (movedNode) movedNode.presentation.layoutSide = layoutSide;
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
      if (oldParent) {
        oldParent.removeChild(node.id);
        this.mindMap.unregisterNode(node);
      }
      node.parentId = parent.id; // Update parent ID immediately so it acts as child
    } else if (node.parentId === parent.id) {
      // Remove from current position to re-insert
      parent.removeChild(node.id);
      this.mindMap.unregisterNode(node);
    }

    // Check if target is still in children? Yes.
    const targetIndex = parent.children.findIndex((c) => c.id === targetId);
    if (targetIndex === -1) {
      // Fallback: append
      parent.addChild(node);
      this.mindMap.registerNode(node);
      return true;
    }

    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
    parent.insertChild(node, insertIndex);
    this.mindMap.registerNode(node);

    // Propagate potential side change if moving under Root
    if (parent.isRoot) {
      // Inherit side from target if possible?
      // If dragging Top/Bottom of a sibling, we generally want to stay on that side.
      // Target has a side.
      if (target.presentation.layoutSide) {
        node.presentation.layoutSide = target.presentation.layoutSide;
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

    // Remove node from its old parent
    if (node.parentId) {
      const oldParent = this.mindMap.findNode(node.parentId);
      if (oldParent) {
        oldParent.removeChild(node.id);
        this.mindMap.unregisterNode(node);
      }
    }

    // Insert node into target's parent at target's index
    const index = targetParent.children.findIndex((c) => c.id === targetId);
    if (index === -1) return false;

    // Inherit layoutSide if replacing a node (especially under Root)
    if (targetParent.isRoot && target.presentation.layoutSide) {
      node.presentation.layoutSide = target.presentation.layoutSide;
    }

    targetParent.removeChild(targetId);
    this.mindMap.unregisterNode(target);
    targetParent.insertChild(node, index);
    this.mindMap.registerNode(node);
    node.parentId = targetParent.id;

    // Add target as child of node
    node.addChild(target);
    this.mindMap.registerNode(target);

    return true;
  }

  insertParent(targetId: string, topic: string = 'New topic'): Node | null {
    const targetNode = this.mindMap.findNode(targetId);
    if (!targetNode || !targetNode.parentId) return null;

    const id = this.idGenerator.generate();
    const newParentNode = new Node(id, topic);

    if (this.mindMap.insertParent(targetId, newParentNode)) {
      return newParentNode;
    }
    return null;
  }

  updateNodeIcon(id: string, icon: string): boolean {
    const node = this.mindMap.findNode(id);
    if (node) {
      if (icon === 'delete') {
        node.icon = undefined;
      } else {
        node.icon = icon;
      }
      return true;
    }
    return false;
  }

  addExistingNodes(parentId: string, nodes: Node[]): boolean {
    const parent = this.mindMap.findNode(parentId);
    if (!parent) return false;

    nodes.forEach((node) => {
      parent.addChild(node);
      this.mindMap.registerNode(node);
    });
    return true;
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
        layoutSide: node.presentation.layoutSide,
        isFolded: node.presentation.isFolded,

        icon: node.icon,
        imageSize: node.imageSize,
        customWidth: node.presentation.customWidth,
      };
      return data;
    };

    const data: MindMapData = {
      nodeData: buildNodeData(this.mindMap.root),
      theme: this.mindMap.theme,
    };

    return data;
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
    this.mindMap.rebuildIndex();
    if (data.theme) {
      this.mindMap.theme = data.theme;
    }
  }
}
