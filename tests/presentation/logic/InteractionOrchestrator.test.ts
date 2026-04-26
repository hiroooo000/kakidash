/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionOrchestrator } from '../../../src/presentation/logic/InteractionOrchestrator';
import { CommandBus } from '../../../src/presentation/commands/CommandBus';
import { InteractionOptions } from '../../../src/presentation/types/InteractionOptions';
import { MindMap } from '../../../src/features/core/domain/MindMap';
import { Node } from '../../../src/features/core/domain/Node';

describe('InteractionOrchestrator Navigation', () => {
  let container: HTMLElement;
  let options: InteractionOptions;
  let orchestrator: InteractionOrchestrator;
  let commandBus: CommandBus;
  let dispatchSpy: any;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container); // needed for event capture

    options = {
      shortcuts: {},
    } as any;
    commandBus = new CommandBus();
    dispatchSpy = vi.spyOn(commandBus, 'dispatch');

    const root = new Node('root', 'Root', null, true);
    const mindMap = new MindMap(root);

    orchestrator = new InteractionOrchestrator({
      container,
      options,
      commandBus,
      mindMap,
      getSelectedNodeId: () => 'root',
      getNodeElement: (id) =>
        container.querySelector(`.mindmap-node[data-id="${id}"]`) as HTMLElement,
      zoomNode: vi.fn(),
    });
  });

  afterEach(() => {
    orchestrator.destroy();
    document.body.removeChild(container);
  });

  it('should dispatch navigate command with extendSelection=true when Shift+ArrowUp is pressed', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'navigate',
      nodeId: 'root',
      direction: 'Up',
      extendSelection: true,
    });
  });

  it('should dispatch navigate command with extendSelection=true when Shift+ArrowDown is pressed', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'navigate',
      nodeId: 'root',
      direction: 'Down',
      extendSelection: true,
    });
  });

  it('should dispatch navigate command with extendSelection=false when ArrowUp is pressed without Shift', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      shiftKey: false,
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'navigate',
      nodeId: 'root',
      direction: 'Up',
      extendSelection: false,
    });
  });

  it('should handle image paste and dispatch pasteImage', async () => {
    // Mock FileReader
    const originalFileReader = global.FileReader;
    global.FileReader = class {
      onload: ((event: any) => void) | null = null;
      readAsDataURL() {
        if (this.onload) {
          this.onload({ target: { result: 'data:image/png;base64,testdata' } } as any);
        }
      }
    } as any;

    // Mock Image
    const originalImage = global.Image;
    global.Image = class {
      onload: () => void = () => {};
      width = 800;
      height = 600;
      set src(_val: string) {
        setTimeout(() => this.onload(), 0);
      }
    } as any;

    try {
      const clipboardEvent = new Event('paste', { bubbles: true }) as ClipboardEvent;
      Object.defineProperty(clipboardEvent, 'clipboardData', {
        value: {
          items: [
            {
              type: 'image/png',
              getAsFile: () => new Blob([''], { type: 'image/png' }),
            },
          ],
        },
      });

      container.dispatchEvent(clipboardEvent);

      // Wait for async onload
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(dispatchSpy).toHaveBeenCalledWith({
        type: 'pasteImage',
        parentId: 'root',
        imageData: 'data:image/png;base64,testdata',
        width: 800,
        height: 600,
      });
    } finally {
      global.FileReader = originalFileReader;
      global.Image = originalImage;
    }
  });
});
