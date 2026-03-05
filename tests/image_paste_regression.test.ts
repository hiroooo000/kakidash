/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionOrchestrator } from '../src/presentation/logic/InteractionOrchestrator';
import { CommandBus } from '../src/presentation/commands/CommandBus';
import { MindMap } from '../src/features/core/domain/MindMap';
import { Node } from '../src/features/core/domain/Node';

describe('Image Paste Regression', () => {
  let container: HTMLElement;
  let orchestrator: InteractionOrchestrator;
  let commandBus: CommandBus;
  let mindMap: MindMap;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    commandBus = new CommandBus();
    const root = new Node('root', 'Root', null, true);
    mindMap = new MindMap(root);

    orchestrator = new InteractionOrchestrator({
      container,
      commandBus,
      mindMap,
      options: {} as any,
      getSelectedNodeId: () => 'root',
      getNodeElement: (id) => {
        const el = document.createElement('div');
        el.setAttribute('data-id', id);
        return el;
      },
      zoomNode: vi.fn(),
    });
  });

  afterEach(() => {
    orchestrator.destroy();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  it('should allow paste event to propagate through KeyboardShortcutHandler', () => {
    let pasteEventFired = false;
    container.addEventListener('paste', () => {
      pasteEventFired = true;
    });

    // Simulate Ctrl+V keydown
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'v',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(keydownEvent);

    // KeyboardShortcutHandler should NOT have called preventDefault()
    expect(keydownEvent.defaultPrevented).toBe(false);

    // Verify paste event fired (not expected by keydown alone in JSDOM)
    expect(pasteEventFired).toBe(false);

    // In a real browser, lack of preventDefault() on keydown
    // allows the following 'paste' event to fire if the browser thinks it's a paste.
    // However, in JSDOM/Vitest, dispatching keydown doesn't automatically fire 'paste'.
    // So we manually dispatch 'paste' to verify Orchestrator's handling.
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as any;
    pasteEvent.clipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => new File([''], 'test.png', { type: 'image/png' }),
        },
      ],
    };

    container.dispatchEvent(pasteEvent);
    expect(pasteEvent.defaultPrevented).toBe(true);
  });

  it('should dispatch pasteImage command when image is in clipboard', async () => {
    const dispatchSpy = vi.spyOn(commandBus, 'dispatch');

    // Mock Image to fire onload automatically
    const originalImage = global.Image;
    global.Image = class extends originalImage {
      set src(value: string) {
        super.src = value;
        setTimeout(() => {
          if (this.onload) (this.onload as any)();
        }, 0);
      }
    } as any;

    try {
      // Mock FileReader and Image
      // (Actual async flow occurs, so we just wait for it for verification)

      // We need to mock globally used Image and FileReader if we want to test the full async flow,
      // but spying on commandBus.dispatch is enough if we trigger the paste correctly.

      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as any;
      pasteEvent.clipboardData = {
        items: [
          {
            type: 'image/png',
            getAsFile: () => new Blob([''], { type: 'image/png' }),
          },
        ],
      };

      // Since InteractionOrchestrator uses FileReader.readAsDataURL and new Image().onload,
      // it's async. We'll wait a bit or use vi.waitFor.

      container.dispatchEvent(pasteEvent);

      await vi.waitFor(
        () => {
          expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'pasteImage',
              parentId: 'root',
            }),
          );
        },
        { timeout: 1000 },
      );
    } finally {
      global.Image = originalImage;
    }
  });
});
