/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZoomPanHandler } from '../../../../src/presentation/logic/handlers/ZoomPanHandler';
import { CommandBus } from '../../../../src/presentation/commands/CommandBus';
import { Command } from '../../../../src/presentation/commands/Command';

describe('ZoomPanHandler', () => {
  let commandBus: CommandBus;
  let handler: ZoomPanHandler;
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

    handler = new ZoomPanHandler({ commandBus, container });
  });

  afterEach(() => {
    handler.destroy();
    document.body.removeChild(container);
    dispatchedCommands = [];
    vi.clearAllMocks();
  });

  it('should dispatch pan command on mousemove after background mousedown', () => {
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      bubbles: true,
    });
    container.dispatchEvent(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 150,
      clientY: 120,
      bubbles: true,
    });
    window.dispatchEvent(mouseMoveEvent);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'pan',
      dx: 50,
      dy: 20,
    });
  });

  it('should not pan if mousedown is on a mindmap-node', () => {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'mindmap-node';
    container.appendChild(nodeEl);

    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      bubbles: true,
    });
    // Dispatch specifically on the node
    nodeEl.dispatchEvent(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 150,
      clientY: 120,
      bubbles: true,
    });
    window.dispatchEvent(mouseMoveEvent);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('should dispatch zoom command on ctrl+wheel', () => {
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100,
      bubbles: true,
    });
    Object.defineProperty(wheelEvent, 'ctrlKey', { value: true });
    Object.defineProperty(wheelEvent, 'clientX', { value: 200 });
    Object.defineProperty(wheelEvent, 'clientY', { value: 200 });
    container.dispatchEvent(wheelEvent);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'zoom',
      delta: -100,
      x: 200,
      y: 200,
    });
  });

  it('should dispatch pan command on wheel without ctrl', () => {
    const wheelEvent = new WheelEvent('wheel', {
      deltaX: 50,
      deltaY: 10,
      deltaMode: 0, // Pixels
      bubbles: true,
    });
    container.dispatchEvent(wheelEvent);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'pan',
      dx: -50,
      dy: -10,
    });
  });
});
