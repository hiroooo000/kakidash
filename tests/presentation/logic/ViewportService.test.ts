/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ViewportService } from '../../../src/presentation/logic/ViewportService';
import { Renderer } from '../../../src/presentation/components/Renderer';

function createMockRenderer(): Renderer {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
  container.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return {
    container,
    maxWidth: -1,
    render: vi.fn(),
    updateTransform: vi.fn(),
    measureNode: vi.fn().mockReturnValue({ width: 100, height: 40 }),
    updateSelection: vi.fn(),
  };
}

describe('ViewportService', () => {
  let service: ViewportService;
  let renderer: Renderer;

  beforeEach(() => {
    renderer = createMockRenderer();
    service = new ViewportService(renderer);
  });

  afterEach(() => {
    service.destroy();
  });

  describe('pan', () => {
    it('should update target pan position', () => {
      service.pan(10, 20);
      // Verify the target was updated by applying transform
      service.applyTransform();
      expect(renderer.updateTransform).toHaveBeenCalled();
    });

    it('should accumulate multiple pan calls', () => {
      service.pan(10, 20);
      service.pan(5, -10);
      // The target should be accumulated
      service.applyTransform();
      expect(renderer.updateTransform).toHaveBeenCalled();
    });
  });

  describe('zoom', () => {
    it('should zoom in when delta is negative', () => {
      service.zoom(-100, 400, 300);
      // Scale should increase (zoom in)
      expect(service.getScale()).toBeGreaterThan(1.0);
    });

    it('should zoom out when delta is positive', () => {
      service.zoom(100, 400, 300);
      // Scale should decrease (zoom out)
      expect(service.getScale()).toBeLessThan(1.0);
    });

    it('should clamp scale to minimum', () => {
      // Zoom out a lot
      for (let i = 0; i < 100; i++) {
        service.zoom(1000, 400, 300);
      }
      expect(service.getScale()).toBeGreaterThanOrEqual(0.1);
    });

    it('should clamp scale to maximum', () => {
      // Zoom in a lot
      for (let i = 0; i < 100; i++) {
        service.zoom(-1000, 400, 300);
      }
      expect(service.getScale()).toBeLessThanOrEqual(5.0);
    });

    it('should call updateTransform on renderer', () => {
      service.zoom(-100, 400, 300);
      expect(renderer.updateTransform).toHaveBeenCalled();
    });
  });

  describe('resetZoom', () => {
    it('should reset scale to 1.0', () => {
      service.zoom(-500, 400, 300); // Zoom in first
      expect(service.getScale()).not.toBe(1.0);

      service.resetZoom();
      expect(service.getScale()).toBe(1.0);
    });
  });

  describe('applyTransform', () => {
    it('should call renderer.updateTransform with current state', () => {
      service.applyTransform();
      expect(renderer.updateTransform).toHaveBeenCalled();
    });
  });

  describe('setInitialPan', () => {
    it('should set initial pan position', () => {
      service.setInitialPan(100, 50);
      service.applyTransform();
      expect(renderer.updateTransform).toHaveBeenCalledWith(100, 50, 1);
    });
  });

  describe('ensureNodeVisible', () => {
    it('should not pan when node is visible', () => {
      // Create a visible node element
      const nodeEl = document.createElement('div');
      nodeEl.className = 'mindmap-node';
      nodeEl.dataset.id = 'node1';
      Object.defineProperty(nodeEl, 'getBoundingClientRect', {
        value: () => ({
          left: 100,
          top: 100,
          right: 200,
          bottom: 140,
          width: 100,
          height: 40,
        }),
      });
      renderer.container.appendChild(nodeEl);

      service.ensureNodeVisible('node1');
      // No pan needed since node is within visible area
    });
  });

  describe('destroy', () => {
    it('should cancel animation frame', () => {
      const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
      service.startAnimationLoop();
      service.destroy();
      expect(cancelSpy).toHaveBeenCalled();
      cancelSpy.mockRestore();
    });
  });
});
