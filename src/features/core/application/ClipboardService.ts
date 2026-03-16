import { MindMap } from '../domain/MindMap';
import { Node } from '../domain/Node';
import { IdGenerator } from '../../../shared/kernel/IdGenerator';

export class ClipboardService {
  private clipboard: Node[] = [];

  constructor(
    private mindMap: MindMap,
    private idGenerator: IdGenerator,
  ) {}

  copyNodes(nodeIds: string[]): void {
    this.clipboard = [];
    const texts: string[] = [];

    // Filter out nodes whose ancestors are also in the selection
    const selectedIdsSet = new Set(nodeIds);
    const rootsToCopy: string[] = [];

    nodeIds.forEach((id) => {
      let isDescendantOfSelected = false;
      const node = this.mindMap.findNode(id);

      if (node) {
        let current = node.parentId ? this.mindMap.findNode(node.parentId) : null;
        while (current) {
          if (selectedIdsSet.has(current.id)) {
            isDescendantOfSelected = true;
            break;
          }
          current = current.parentId ? this.mindMap.findNode(current.parentId) : null;
        }
      }

      if (!isDescendantOfSelected) {
        rootsToCopy.push(id);
      }
    });

    rootsToCopy.forEach((id) => {
      const node = this.mindMap.findNode(id);
      if (node) {
        this.clipboard.push(this.deepCloneNode(node));
        texts.push(node.topic);
      }
    });

    if (typeof navigator !== 'undefined' && navigator.clipboard && texts.length > 0) {
      navigator.clipboard.writeText(texts.join('\n')).catch((err) => {
        console.error('Failed to write to clipboard', err);
      });
    }
  }

  getClipboardNodes(): Node[] {
    return this.clipboard;
  }

  createPastedNodes(parentId: string, systemClipboardText?: string): Node[] {
    const parent = this.mindMap.findNode(parentId);
    if (!parent) return [];

    let isInternalMatch = false;

    if (this.clipboard.length > 0 && systemClipboardText !== undefined) {
      // Normalize both texts for comparison (e.g., CRLF to LF)
      const internalText = this.clipboard.map((n) => n.topic).join('\n');
      const normalizedSystem = systemClipboardText.replace(/\r\n/g, '\n');

      if (internalText === normalizedSystem) {
        isInternalMatch = true;
      }
    } else if (this.clipboard.length > 0 && systemClipboardText === undefined) {
      // Fallback: If no system text is provided but we have internal clipboard, assume internal
      isInternalMatch = true;
    }

    const newNodes: Node[] = [];

    if (!isInternalMatch && systemClipboardText) {
      // Create a single new node with the external text
      const newId = this.idGenerator.generate();
      const newNode = new Node(newId, systemClipboardText);
      newNodes.push(newNode);
    } else if (this.clipboard.length > 0) {
      // Use internal clipboard
      this.clipboard.forEach((clipNode) => {
        // Clone again from clipboard to create new instance for the tree
        const newNode = this.deepCloneNode(clipNode);
        // Regenerate IDs for the new node and its children
        this.regenerateIds(newNode);
        newNodes.push(newNode);
      });
    }

    return newNodes;
  }

  private deepCloneNode(node: Node): Node {
    const clone = new Node(
      node.id,
      node.topic,
      null,
      false,
      node.image,
      node.presentation.layoutSide,
      node.presentation.isFolded,
      node.icon,
      node.imageSize && { ...node.imageSize },
      node.presentation.customWidth,
    );
    clone.style = { ...node.style };
    clone.children = node.children.map((child) => this.deepCloneNode(child));
    clone.children.forEach((child) => (child.parentId = clone.id));
    return clone;
  }

  private regenerateIds(node: Node): void {
    node.id = this.idGenerator.generate();
    node.children.forEach((child) => {
      child.parentId = node.id;
      this.regenerateIds(child);
    });
  }
}
