// @vitest-environment happy-dom
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach } from 'vitest';
import { Kakidash } from '../src/index';

describe('Paste Auto-Pan Logic', () => {
  let container: HTMLElement;
  let board: Kakidash;

  beforeEach(() => {
    container = document.createElement('div');
    board = new Kakidash(container);
  });

  it('should auto-pan when pasting a node off-screen', async () => {
    const rootId = board.getRootId();
    board.selectNode(rootId);

    // Force initial pan to 0,0 via viewportService
    const vs = (board as any).controller.viewportService;
    vs.setInitialPan(0, 0);

    // Mock getBoundingClientRect
    const originalGBR = HTMLElement.prototype.getBoundingClientRect;

    HTMLElement.prototype.getBoundingClientRect = function () {
      // Container
      if (this === (board as any).controller.renderer.container) {
        return {
          left: 0,
          top: 0,
          right: 800,
          bottom: 600,
          width: 800,
          height: 600,
          x: 0,
          y: 0,
          toJSON: () => {},
        } as DOMRect;
      }

      // Node (Assume any node we look for is off-screen for this test)
      // In reality, we'd check ID, but for "newly pasted node", it might be hard to predict ID.
      // But ensureNodeVisible searches by ID.
      // Let's just say IF we call ensureNodeVisible, we find *something* offscreen.
      if (this.classList && this.classList.contains('mindmap-node')) {
        return {
          left: 1000,
          top: 300,
          right: 1100,
          bottom: 350,
          width: 100,
          height: 50,
          x: 1000,
          y: 300,
          toJSON: () => {},
        } as DOMRect;
      }

      return {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect;
    };

    try {
      // Copy root node to internal clipboard
      board.copyNode(rootId);

      // Act: Paste Node
      board.pasteNode(rootId);

      // Wait for setTimeout
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Logic:
      // Node Center X = 1050
      // Container Center X = 400
      // Expected dx = 400 - 1050 = -650

      const vs2 = (board as any).controller.viewportService;
      const pan = vs2.getTargetPan();
      expect(pan.x).toBe(-650);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGBR;
    }
  });

  it('should auto-pan when pasting an image off-screen', async () => {
    const rootId = board.getRootId();
    board.selectNode(rootId);

    // Force initial pan via viewportService
    const vs = (board as any).controller.viewportService;
    vs.setInitialPan(0, 0);

    const originalGBR = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      if (this === (board as any).controller.renderer.container) {
        return {
          left: 0,
          top: 0,
          right: 800,
          bottom: 600,
          width: 800,
          height: 600,
          x: 0,
          y: 0,
          toJSON: () => {},
        } as DOMRect;
      }
      if (this.classList && this.classList.contains('mindmap-node')) {
        return {
          left: 1000,
          top: 300,
          right: 1100,
          bottom: 350,
          width: 100,
          height: 50,
          x: 1000,
          y: 300,
          toJSON: () => {},
        } as DOMRect;
      }
      return {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect;
    };

    let originalGenerate: any;
    try {
      // Mock generateThumbnail
      const controller = (board as any).controller;
      originalGenerate = controller.imageProcessingService.generateThumbnail;
      controller.imageProcessingService.generateThumbnail = () =>
        Promise.resolve({
          thumbnailBase64: 'mock_thumbnail',
          width: 100,
          height: 100,
        });

      // Act: Paste Image
      board.pasteImage(rootId, 'data:image/png;base64,dummy');

      // Wait for setTimeout (if any)
      await new Promise((resolve) => setTimeout(resolve, 50));

      const vs2 = (board as any).controller.viewportService;
      const pan = vs2.getTargetPan();
      expect(pan.x).toBe(-650);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGBR;
      const controller = (board as any).controller;
      controller.imageProcessingService.generateThumbnail = originalGenerate;
    }
  });
});
