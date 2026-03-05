/* eslint-disable @typescript-eslint/no-explicit-any */
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
    dispatchedCommands = [];
    vi.clearAllMocks();
  });

  it('should dispatch dropNode command on valid drop', () => {
    // Mock the start of a drag on node 1
    const node1 = document.createElement('div');
    node1.className = 'mindmap-node';
    node1.dataset.id = 'node1';
    container.appendChild(node1);

    const dragStartEvent = new DragEvent('dragstart', { bubbles: true });
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: { setData: vi.fn(), effectAllowed: 'uninitialized' },
    });
    node1.dispatchEvent(dragStartEvent);

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

    const dropEvent = new DragEvent('drop', {
      clientX: 80, // > w * 0.75 -> right
      clientY: 50,
      bubbles: true,
    });
    node2.dispatchEvent(dropEvent);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'dropNode',
      draggedId: 'node1',
      targetId: 'node2',
      position: 'right',
    });

    expect(handler.draggedNodeId).toBeNull();
  });

  it('should not dispatch dropNode if dropped on same node', () => {
    // Mock the start of a drag on node 1
    const node1 = document.createElement('div');
    node1.className = 'mindmap-node';
    node1.dataset.id = 'node1';
    container.appendChild(node1);

    const dragStartEvent = new DragEvent('dragstart', { bubbles: true });
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: { setData: vi.fn(), effectAllowed: 'uninitialized' },
    });
    node1.dispatchEvent(dragStartEvent);

    // Mock drop on node 1
    const dropEvent = new DragEvent('drop', {
      clientX: 80,
      clientY: 50,
      bubbles: true,
    });
    node1.dispatchEvent(dropEvent);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should block operations in read-only mode', () => {
    handler.setReadOnly(true);

    const node1 = document.createElement('div');
    node1.className = 'mindmap-node';
    node1.dataset.id = 'node1';
    container.appendChild(node1);

    const dragStartEvent = new DragEvent('dragstart', { cancelable: true, bubbles: true });
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: { setData: vi.fn(), effectAllowed: 'uninitialized' },
    });
    const prevented = !node1.dispatchEvent(dragStartEvent);

    expect(prevented).toBe(true);
    expect(handler.draggedNodeId).toBeNull();
  });
});
