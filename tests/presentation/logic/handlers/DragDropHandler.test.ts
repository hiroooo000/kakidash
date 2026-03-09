/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DragDropHandler } from '../../../../src/presentation/logic/handlers/DragDropHandler';
import { CommandBus } from '../../../../src/presentation/commands/CommandBus';
import { Command } from '../../../../src/presentation/commands/Command';

describe('DragDropHandler', () => {
  let commandBus: CommandBus;
  let handler: DragDropHandler;
  let container: HTMLElement;
  let dispatchedCommands: Command[] = [];

  let dispatchSpy: any;

  beforeEach(() => {
    commandBus = new CommandBus();
    dispatchSpy = vi.spyOn(commandBus, 'dispatch').mockImplementation((command: Command) => {
      dispatchedCommands.push(command);
    });

    container = document.createElement('div');
    document.body.appendChild(container);

    handler = new DragDropHandler({ commandBus, container });
  });

  afterEach(() => {
    handler.destroy();
    document.body.removeChild(container);
    document.querySelectorAll('.kakidash-drag-ghost').forEach((el) => el.remove());
    dispatchedCommands = [];
    vi.clearAllMocks();
  });

  it('should start drag and create ghost element on valid pointerdown', () => {
    // Mock the start of a drag on node 1
    const node1 = document.createElement('div');
    node1.className = 'mindmap-node';
    node1.dataset.id = 'node1';
    container.appendChild(node1);

    const pointerDownEvent = new PointerEvent('pointerdown', {
      bubbles: true,
      clientX: 10,
      clientY: 10,
    });
    // Mock setPointerCapture
    node1.setPointerCapture = vi.fn();
    node1.dispatchEvent(pointerDownEvent);

    expect(handler.draggedNodeId).toBe('node1');
    // Ghost element should be created
    const ghost = document.querySelector('.kakidash-drag-ghost');
    expect(ghost).not.toBeNull();
    // capture must be set
    expect(node1.setPointerCapture).toHaveBeenCalled();
  });

  it('should emit dropNode on pointerup over target', () => {
    // Mock the start of a drag on node 1
    const node1 = document.createElement('div');
    node1.className = 'mindmap-node';
    node1.dataset.id = 'node1';
    container.appendChild(node1);

    // Provide getBoundingClientRect to avoid errors in real implementations
    Object.defineProperty(node1, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 50,
        height: 50,
        right: 50,
        bottom: 50,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });

    node1.setPointerCapture = vi.fn();
    node1.releasePointerCapture = vi.fn();

    const pointerDownEvent = new PointerEvent('pointerdown', {
      bubbles: true,
      clientX: 10,
      clientY: 10,
    });
    node1.dispatchEvent(pointerDownEvent);

    expect(handler.draggedNodeId).toBe('node1');

    // Mock drop on node 2
    const node2 = document.createElement('div');
    node2.className = 'mindmap-node';
    node2.dataset.id = 'node2';
    // Position of drop logic uses getBoundingClientRect
    Object.defineProperty(node2, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    });
    container.appendChild(node2);

    // Mock document.elementFromPoint to return node2 during pointerup/move
    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn().mockReturnValue(node2);

    const pointerUpEvent = new PointerEvent('pointerup', {
      clientX: 80, // > w * 0.75 -> right
      clientY: 50,
      bubbles: true,
      pointerId: pointerDownEvent.pointerId,
    });
    node1.hasPointerCapture = vi.fn().mockReturnValue(true);
    node1.dispatchEvent(pointerUpEvent);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'dropNode',
      draggedId: 'node1',
      targetId: 'node2',
      position: 'right',
    });

    expect(handler.draggedNodeId).toBeNull();
    const ghost = document.querySelector('.kakidash-drag-ghost');
    expect(ghost).toBeNull(); // Ghost should be cleaned up
    expect(node1.releasePointerCapture).toHaveBeenCalled();

    // Restore
    document.elementFromPoint = originalElementFromPoint;
  });

  it('should not dispatch dropNode if dropped on same node', () => {
    // Mock the start of a drag on node 1
    const node1 = document.createElement('div');
    node1.className = 'mindmap-node';
    node1.dataset.id = 'node1';
    node1.setPointerCapture = vi.fn();
    node1.releasePointerCapture = vi.fn();
    container.appendChild(node1);

    const pointerDownEvent = new PointerEvent('pointerdown', { bubbles: true });
    node1.dispatchEvent(pointerDownEvent);

    // Mock document.elementFromPoint to return node1
    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn().mockReturnValue(node1);

    // Mock drop on node 1
    const pointerUpEvent = new PointerEvent('pointerup', {
      clientX: 80,
      clientY: 50,
      bubbles: true,
    });
    node1.dispatchEvent(pointerUpEvent);

    expect(dispatchSpy).not.toHaveBeenCalled();
    // Restore
    document.elementFromPoint = originalElementFromPoint;
  });

  it('should block operations in read-only mode', () => {
    handler.setReadOnly(true);

    const node1 = document.createElement('div');
    node1.className = 'mindmap-node';
    node1.dataset.id = 'node1';
    container.appendChild(node1);

    const pointerDownEvent = new PointerEvent('pointerdown', { cancelable: true, bubbles: true });
    // In Pointer Events, preventDefault doesn't necessarily prevent the event from propagating or doing pointer capture in the exact same way as dragstart,
    // but we can still check if our handler called it or if it behaves as expected.
    // For now we just dispatch it to test read-only mode behavior.
    node1.dispatchEvent(pointerDownEvent);

    // In this handler implementation, readonly might prevent start, or just ignore.
    // Ensure draggedNodeId is not set.
    expect(handler.draggedNodeId).toBeNull();
  });
});
