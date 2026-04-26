/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kakidash } from '../src/index';

describe('Image Zoom Readonly Mode', () => {
  let container: HTMLElement;
  let mindMap: Kakidash;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    mindMap = new Kakidash(container);
  });

  afterEach(() => {
    mindMap.destroy();
    document.body.removeChild(container);
    // Cleanup any modals
    const modals = document.querySelectorAll('div[style*="z-index: 1000"]');
    modals.forEach((m) => m.remove());
  });

  it('should enable readonly mode when image is zoomed and disable when closed', async () => {
    // 1. Setup MindMap with an image node
    const rootId = mindMap.getRootId();
    const imageData =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    // Mock generateThumbnail
    const controller = (mindMap as any).controller;
    const originalGenerate = controller.imageProcessingService.generateThumbnail;
    controller.imageProcessingService.generateThumbnail = () =>
      Promise.resolve({
        thumbnailBase64: imageData, // reuse the image data as thumbnail
        width: 100,
        height: 100,
      });

    try {
      mindMap.pasteImage(rootId, imageData, 100, 100);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 2. The render happens in the container.
      // In our simplified test environment, we might need a manual query.
      const zoomBtn = container.querySelector('.mindmap-node img + div') as HTMLElement;
      expect(zoomBtn).not.toBeNull();

      // 3. Spy on Orchestrator state
      const orchestrator = mindMap.interactionOrchestrator;
      expect(orchestrator).toBeDefined();
      expect(orchestrator.isReadOnlyState).toBe(false);

      // 4. Click Zoom
      zoomBtn.click();

      // 5. Verify ReadOnly is true
      expect(orchestrator.isReadOnlyState).toBe(true);

      // 6. Verify Modal exists
      const modal = document.querySelector('div[style*="z-index: 1000"]');
      expect(modal).not.toBeNull();

      // 7. Click Modal to close
      if (modal) {
        (modal as HTMLElement).click();
      }

      // 8. Verify ReadOnly is false again
      expect(orchestrator.isReadOnlyState).toBe(false);
    } finally {
      controller.imageProcessingService.generateThumbnail = originalGenerate;
    }
  });
});
