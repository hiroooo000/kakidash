import { describe, it, expect, vi } from 'vitest';
import { CommandBus } from '../../../src/presentation/commands/CommandBus';
import { Command } from '../../../src/presentation/commands/Command';

describe('CommandBus', () => {
  it('should register a handler and dispatch a command', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.on('addNode', handler);
    const command: Command = { type: 'addNode', parentId: 'root' };
    bus.dispatch(command);

    expect(handler).toHaveBeenCalledWith(command);
  });

  it('should not dispatch to handlers of different command types', () => {
    const bus = new CommandBus();
    const handlerAddNode = vi.fn();
    const handlerDeleteNode = vi.fn();

    bus.on('addNode', handlerAddNode);
    bus.on('deleteNode', handlerDeleteNode);

    const command: Command = { type: 'addNode', parentId: 'root' };
    bus.dispatch(command);

    expect(handlerAddNode).toHaveBeenCalledWith(command);
    expect(handlerDeleteNode).not.toHaveBeenCalled();
  });

  it('should unregister a handler', () => {
    const bus = new CommandBus();
    const handler = vi.fn();

    bus.on('addNode', handler);
    bus.off('addNode', handler);

    const command: Command = { type: 'addNode', parentId: 'root' };
    bus.dispatch(command);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should clear all handlers on destroy', () => {
    const bus = new CommandBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('addNode', handler1);
    bus.on('deleteNode', handler2);

    bus.destroy();

    const command1: Command = { type: 'addNode', parentId: 'root' };
    const command2: Command = { type: 'deleteNode', nodeId: 'node1' };

    bus.dispatch(command1);
    bus.dispatch(command2);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });
});
