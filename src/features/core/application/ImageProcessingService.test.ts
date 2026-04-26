import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageProcessingService } from './ImageProcessingService';

describe('ImageProcessingService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate a thumbnail from base64 string', async () => {
    const service = new ImageProcessingService();
    const originalBase64 = 'data:image/png;base64,mock';

    // Mock Image
    const originalImage = global.Image;
    global.Image = class {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      width = 1000;
      height = 500;
      private _src: string = '';

      get src() {
        return this._src;
      }
      set src(val: string) {
        this._src = val;
        setTimeout(() => this.onload(), 0);
      }
    } as unknown as typeof Image;

    // Mock Canvas
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({
            drawImage: vi.fn(),
          })),
          toDataURL: vi.fn(() => 'data:image/webp;base64,mockedThumbnail'),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    }) as unknown as typeof document.createElement;

    try {
      const result = await service.generateThumbnail(originalBase64, 200);
      expect(result.thumbnailBase64).toBe('data:image/webp;base64,mockedThumbnail');
      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
    } finally {
      global.Image = originalImage;
      document.createElement = originalCreateElement;
    }
  });

  it('should scale down large images proportionally', () => {
    const service = new ImageProcessingService();
    const result = service.calculateDimensions(1000, 500, 200);
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('should not scale up images smaller than maxWidth', () => {
    const service = new ImageProcessingService();
    const result = service.calculateDimensions(100, 50, 200);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });
});
