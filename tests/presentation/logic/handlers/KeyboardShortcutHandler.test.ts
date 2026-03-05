/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyboardShortcutHandler } from '../../../../src/presentation/logic/handlers/KeyboardShortcutHandler';
import { CommandBus } from '../../../../src/presentation/commands/CommandBus';
import { Command } from '../../../../src/presentation/commands/Command';

describe('KeyboardShortcutHandler', () => {
  let commandBus: CommandBus;
  let handler: KeyboardShortcutHandler;
  let container: HTMLElement;
  let dispatchedCommands: Command[] = [];

  let dispatchSpy: any;

  beforeEach(() => {
    commandBus = new CommandBus();
    dispatchSpy = vi.spyOn(commandBus, 'dispatch').mockImplementation((command: Command) => {
      dispatchedCommands.push(command);
    });

    container = document.createElement('div');
    document.body.appendChild(container); // needed for getBoundingClientRect

    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    });

    const selectedNodeId: string | null = 'root';

    handler = new KeyboardShortcutHandler({ commandBus, container }, () => selectedNodeId);
  });

  afterEach(() => {
    handler.destroy();
    document.body.removeChild(container);
    dispatchedCommands = [];
    vi.clearAllMocks();
  });

  it('should dispatch undo command correctly on Ctrl+Z', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'undo' });
  });

  it('should dispatch navDown on ArrowDown', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      shiftKey: false,
    });
    document.dispatchEvent(event);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'navigate',
      nodeId: 'root',
      direction: 'Down',
      extendSelection: false,
    });
  });

  it('should not dispatch node write actions if readOnly', () => {
    handler.setReadOnly(true);
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
    });
    document.dispatchEvent(event);

    expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'addSibling' }));
  });
});
