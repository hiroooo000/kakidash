import { Renderer } from '../../presentation/components/Renderer';

/**
 * Manages viewport state (pan, zoom, scale) and animation.
 * Extracted from MindMapController to follow Single Responsibility Principle.
 */
export class ViewportService {
  private panX: number = 0;
  private panY: number = 0;
  private targetPanX: number = 0;
  private targetPanY: number = 0;
  private scale: number = 1;
  private animationFrameId: number | null = null;
  private renderer: Renderer;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  /** Get current scale factor */
  getScale(): number {
    return this.scale;
  }

  /** Get current pan position */
  getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  /** Get target pan position (for animation destination) */
  getTargetPan(): { x: number; y: number } {
    return { x: this.targetPanX, y: this.targetPanY };
  }

  /** Set initial pan position (used during initialization) */
  setInitialPan(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
    this.targetPanX = x;
    this.targetPanY = y;
  }

  /** Pan the viewport by delta values */
  pan(dx: number, dy: number): void {
    this.targetPanX += dx;
    this.targetPanY += dy;
  }

  /** Zoom centered on a specific screen coordinate */
  zoom(delta: number, clientX: number, clientY: number): void {
    const ZOOM_SENSITIVITY = 0.001;
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5.0;

    const rect = this.renderer.container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const newScale = Math.min(
      Math.max(this.scale * (1 - delta * ZOOM_SENSITIVITY), MIN_SCALE),
      MAX_SCALE,
    );

    const newPanX = x - (x - this.panX) * (newScale / this.scale);
    const newPanY = y - (y - this.panY) * (newScale / this.scale);

    this.panX = newPanX;
    this.panY = newPanY;
    this.targetPanX = newPanX;
    this.targetPanY = newPanY;

    this.scale = newScale;
    this.renderer.updateTransform(this.panX, this.panY, this.scale);
  }

  /** Reset zoom to 1.0 scale */
  resetZoom(): void {
    const cx = this.renderer.container.clientWidth / 2;
    const cy = this.renderer.container.clientHeight / 2;
    const newScale = 1.0;

    this.panX = cx - (cx - this.panX) * (newScale / this.scale);
    this.panY = cy - (cy - this.panY) * (newScale / this.scale);

    this.scale = newScale;
    this.targetPanX = this.panX;
    this.targetPanY = this.panY;
  }

  /** Apply current transform to the renderer */
  applyTransform(): void {
    this.renderer.updateTransform(this.panX, this.panY, this.scale);
  }

  /**
   * Ensure a node is visible in the viewport.
   * Pans the viewport to make the node visible if it's offscreen.
   */
  ensureNodeVisible(
    nodeId: string,
    centerIfOffscreen: boolean = false,
    immediate: boolean = false,
  ): void {
    const nodeEl = this.renderer.container.querySelector(
      `.mindmap-node[data-id="${nodeId}"]`,
    ) as HTMLElement;
    if (!nodeEl) return;

    const rect = nodeEl.getBoundingClientRect();
    const containerRect = this.renderer.container.getBoundingClientRect();
    const padding = 50;
    let dx = 0;
    let dy = 0;
    const isOffLeft = rect.left < containerRect.left + padding;
    const isOffRight = rect.right > containerRect.right - padding;
    const isOffTop = rect.top < containerRect.top + padding;
    const isOffBottom = rect.bottom > containerRect.bottom - padding;

    if (centerIfOffscreen && (isOffLeft || isOffRight || isOffTop || isOffBottom)) {
      const nodeCenterX = rect.left + rect.width / 2;
      const nodeCenterY = rect.top + rect.height / 2;
      const containerCenterX = containerRect.left + containerRect.width / 2;
      const containerCenterY = containerRect.top + containerRect.height / 2;
      dx = containerCenterX - nodeCenterX;
      dy = containerCenterY - nodeCenterY;
    } else {
      if (isOffLeft) dx = containerRect.left + padding - rect.left;
      else if (isOffRight) dx = containerRect.right - padding - rect.right;
      if (isOffTop) dy = containerRect.top + padding - rect.top;
      else if (isOffBottom) dy = containerRect.bottom - padding - rect.bottom;
    }

    if (dx !== 0 || dy !== 0) {
      if (immediate) {
        this.panX += dx;
        this.panY += dy;
        this.targetPanX = this.panX;
        this.targetPanY = this.panY;
        this.renderer.updateTransform(this.panX, this.panY, this.scale);
      } else {
        this.pan(dx, dy);
      }
    }
  }

  /** Start the smooth animation loop for pan transitions */
  startAnimationLoop(): void {
    let lastTime = performance.now();
    const tick = () => {
      const currentTime = performance.now();
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      const decay = 8;
      const factor = 1 - Math.exp(-decay * dt);

      const dx = this.targetPanX - this.panX;
      const dy = this.targetPanY - this.panY;

      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        this.panX += dx * factor;
        this.panY += dy * factor;
        this.renderer.updateTransform(this.panX, this.panY, this.scale);
      } else {
        if (this.panX !== this.targetPanX || this.panY !== this.targetPanY) {
          this.panX = this.targetPanX;
          this.panY = this.targetPanY;
          this.renderer.updateTransform(this.panX, this.panY, this.scale);
        }
      }
      if (Number.isNaN(this.panX)) this.panX = 0;
      if (Number.isNaN(this.panY)) this.panY = 0;

      this.animationFrameId = requestAnimationFrame(tick);
    };
    tick();
  }

  /** Stop animation loop and clean up */
  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
