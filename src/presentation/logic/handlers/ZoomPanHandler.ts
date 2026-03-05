import { CommandBus } from '../../commands/CommandBus';

export interface ZoomPanHandlerDeps {
  commandBus: CommandBus;
  container: HTMLElement;
}

export class ZoomPanHandler {
  private commandBus: CommandBus;
  private container: HTMLElement;
  private isPanning: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private cleanupFns: Array<() => void> = [];

  constructor(deps: ZoomPanHandlerDeps) {
    this.commandBus = deps.commandBus;
    this.container = deps.container;
    this.attachEvents();
  }

  destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  private attachEvents(): void {
    this.container.addEventListener('mousedown', this.handleMouseDown as EventListener);
    this.cleanupFns.push(() => {
      this.container.removeEventListener('mousedown', this.handleMouseDown as EventListener);
    });

    window.addEventListener('mousemove', this.handleMouseMove as EventListener);
    this.cleanupFns.push(() => {
      window.removeEventListener('mousemove', this.handleMouseMove as EventListener);
    });

    window.addEventListener('mouseup', this.stopPanning);
    this.cleanupFns.push(() => {
      window.removeEventListener('mouseup', this.stopPanning);
    });

    window.addEventListener('mouseleave', this.stopPanning);
    this.cleanupFns.push(() => {
      window.removeEventListener('mouseleave', this.stopPanning);
    });

    this.container.addEventListener('wheel', this.handleWheel as EventListener, { passive: false });
    this.cleanupFns.push(() => {
      this.container.removeEventListener('wheel', this.handleWheel as EventListener);
    });
  }

  private handleMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Only start panning if clicking background (not a node/input)
    if (!target.closest('.mindmap-node') && target.tagName !== 'INPUT') {
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.container.style.cursor = 'all-scroll';
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isPanning) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.commandBus.dispatch({ type: 'pan', dx, dy });
    }
  };

  private stopPanning = () => {
    if (this.isPanning) {
      this.isPanning = false;
      this.container.style.cursor = 'default';
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    // Check for Zoom (Ctrl/Meta + Wheel)
    if (e.ctrlKey || e.metaKey) {
      this.commandBus.dispatch({
        type: 'zoom',
        delta: e.deltaY,
        x: e.clientX,
        y: e.clientY,
      });
      return;
    }

    // Normalize delta based on deltaMode
    // 0: Pixel, 1: Line, 2: Page
    let multiplier = 1;
    if (e.deltaMode === 1) {
      // Line
      multiplier = 33; // Approx line height in pixels
    } else if (e.deltaMode === 2) {
      // Page
      multiplier = window.innerHeight;
    }

    const dx = -e.deltaX * multiplier;
    const dy = -e.deltaY * multiplier;

    this.commandBus.dispatch({ type: 'pan', dx, dy });
  };
}
