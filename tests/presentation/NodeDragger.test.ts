/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NodeDragger } from '../../src/presentation/logic/NodeDragger';
import { InteractionOptions } from '../../src/presentation/types/InteractionOptions';

describe('NodeDragger', () => {
  let container: HTMLElement;
  let nodeDragger: NodeDragger;
  let options: InteractionOptions;
  let onDropNode: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    onDropNode = vi.fn();
    options = {
      onNodeClick: vi.fn(),
      onAddChild: vi.fn(),
      onAddSibling: vi.fn(),
      onDeleteNode: vi.fn(),
      onDropNode: onDropNode,
    } as unknown as InteractionOptions; // Cast to avoid mocking all methods

    nodeDragger = new NodeDragger(container, options);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.querySelectorAll('.kakidash-drag-ghost').forEach((el) => el.remove());
    vi.clearAllMocks();
  });

  it('should initialize and inject styles', () => {
    // Check if style tag is added
    const style = document.head.querySelector('style');
    expect(style).not.toBeNull();
    // Use textContent or innerHTML depending on implementation. In NodeDragger it is textContent
    expect(style?.textContent).toContain('.mindmap-node.drag-over-top');
  });

  it('should start drag correctly and set ghost', () => {
    const node = document.createElement('div');
    node.classList.add('mindmap-node');
    node.dataset.id = 'node1';
    node.setPointerCapture = vi.fn();
    container.appendChild(node);

    const event = new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 });
    Object.defineProperty(event, 'target', {
      value: node,
    });

    nodeDragger.handlePointerDown(event);

    expect(nodeDragger.draggedNodeId).toBe('node1');
    expect(node.setPointerCapture).toHaveBeenCalled();
  });

  it('should determine drop position and style on pointer move over', () => {
    // Setup dragged node
    nodeDragger.draggedNodeId = 'node1';

    const targetNode = document.createElement('div');
    targetNode.classList.add('mindmap-node');
    targetNode.dataset.id = 'node2';
    // Mock getBoundingClientRect
    targetNode.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    container.appendChild(targetNode);

    // Mock document.elementFromPoint
    const originalElementFromPoint = document.elementFromPoint;
    const mockElementFromPoint = vi.fn().mockReturnValue(targetNode);
    document.elementFromPoint = mockElementFromPoint;

    const event = {
      target: targetNode, // the target during pointer move is usually the captured node (node1), but elementFromPoint handles finding node2
      clientX: 50,
      clientY: 10, // Top area
    } as unknown as PointerEvent;

    nodeDragger.handlePointerMove(event);

    expect(targetNode.classList.contains('drag-over-top')).toBe(true);

    // Restore
    document.elementFromPoint = originalElementFromPoint;
  });

  it('should handle drop correctly on pointer up', () => {
    // Setup dragged node
    nodeDragger.draggedNodeId = 'node1';

    const targetNode = document.createElement('div');
    targetNode.classList.add('mindmap-node');
    targetNode.dataset.id = 'node2';
    // Mock getBoundingClientRect
    targetNode.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    container.appendChild(targetNode);

    const originalElementFromPoint = document.elementFromPoint;
    const mockElementFromPoint = vi.fn().mockReturnValue(targetNode);
    document.elementFromPoint = mockElementFromPoint;

    const event = {
      target: document.createElement('div'), // Usually the captured node
      preventDefault: vi.fn(),
      clientX: 50,
      clientY: 10, // Top
    } as unknown as PointerEvent;

    // Provide mock releasePointerCapture for the event target
    (event.target as HTMLElement).releasePointerCapture = vi.fn();

    nodeDragger.handlePointerUp(event);

    expect(onDropNode).toHaveBeenCalledWith('node1', 'node2', 'top');
    expect(nodeDragger.draggedNodeId).toBeNull();

    // Restore
    document.elementFromPoint = originalElementFromPoint;
  });
});
