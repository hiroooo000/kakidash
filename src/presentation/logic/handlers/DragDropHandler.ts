import { CommandBus } from '../../commands/CommandBus';

export interface DragDropHandlerDeps {
  commandBus: CommandBus;
  container: HTMLElement;
}

export class DragDropHandler {
  private commandBus: CommandBus;
  private container: HTMLElement;
  public draggedNodeId: string | null = null;
  private isReadOnly: boolean = false;
  private ghostElement: HTMLElement | null = null;
  private isDragging: boolean = false;
  private startPosition: { x: number; y: number } | null = null;
  private readonly DRAG_THRESHOLD = 5;

  private cleanupFns: Array<() => void> = [];

  constructor(deps: DragDropHandlerDeps) {
    this.commandBus = deps.commandBus;
    this.container = deps.container;
    this.injectDragStyles();
    this.attachEvents();
  }

  public setReadOnly(readOnly: boolean): void {
    this.isReadOnly = readOnly;
  }

  destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  private injectDragStyles(): void {
    // Only inject if not already present
    if (!document.getElementById('drag-drop-styles')) {
      const style = document.createElement('style');
      style.id = 'drag-drop-styles';
      style.textContent = `
        .mindmap-node.drag-over-top {
          border-top: 4px solid #007bff !important;
        }
        .mindmap-node.drag-over-bottom {
          border-bottom: 4px solid #007bff !important;
        }
        .mindmap-node.drag-over-left {
          border-left: 4px solid #007bff !important;
        }
        .mindmap-node.drag-over-right {
          border-right: 4px solid #007bff !important;
        }
      `;
      document.head.appendChild(style);

      this.cleanupFns.push(() => {
        const el = document.getElementById('drag-drop-styles');
        if (el) el.remove();
      });
    }
  }

  private attachEvents(): void {
    const handlePointerDown = (e: Event) => this.handlePointerDown(e);
    const handlePointerMove = (e: Event) => this.handlePointerMove(e);
    const handlePointerUp = (e: Event) => this.handlePointerUp(e);

    this.container.addEventListener('pointerdown', handlePointerDown);
    this.cleanupFns.push(() =>
      this.container.removeEventListener('pointerdown', handlePointerDown),
    );

    this.container.addEventListener('pointermove', handlePointerMove);
    this.cleanupFns.push(() =>
      this.container.removeEventListener('pointermove', handlePointerMove),
    );

    this.container.addEventListener('pointerup', handlePointerUp);
    this.cleanupFns.push(() => this.container.removeEventListener('pointerup', handlePointerUp));

    this.container.addEventListener('pointercancel', handlePointerUp);
    this.cleanupFns.push(() =>
      this.container.removeEventListener('pointercancel', handlePointerUp),
    );
  }

  private handlePointerDown = (e: Event): void => {
    const pe = e as PointerEvent;
    if (this.isReadOnly) {
      return;
    }
    const target = pe.target as HTMLElement;
    const nodeEl = target.closest('.mindmap-node') as HTMLElement;
    if (nodeEl && nodeEl.dataset.id) {
      this.draggedNodeId = nodeEl.dataset.id;
      this.startPosition = { x: pe.clientX, y: pe.clientY };
      this.isDragging = false;
      nodeEl.setPointerCapture(pe.pointerId);
    }
  };

  private handlePointerMove = (e: Event): void => {
    const pe = e as PointerEvent;
    if (this.isReadOnly || !this.draggedNodeId) return;

    if (!this.isDragging && this.startPosition) {
      const dx = pe.clientX - this.startPosition.x;
      const dy = pe.clientY - this.startPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= this.DRAG_THRESHOLD) {
        this.isDragging = true;
        this.createGhostElement(pe);
      } else {
        return;
      }
    }

    if (this.ghostElement) {
      this.ghostElement.style.left = `${pe.clientX}px`;
      this.ghostElement.style.top = `${pe.clientY}px`;
    }

    // Find what we are dragging over
    const targetElement = document.elementFromPoint(pe.clientX, pe.clientY) as HTMLElement;
    if (!targetElement) return;

    const nodeEl = targetElement.closest('.mindmap-node') as HTMLElement;

    // Clear all classes first on all nodes to ensure no lingering styles
    this.container.querySelectorAll('.mindmap-node').forEach((el) => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
    });

    if (nodeEl && nodeEl.dataset.id && nodeEl.dataset.id !== this.draggedNodeId) {
      const position = this.getDropPosition(pe, nodeEl);
      nodeEl.classList.add(`drag-over-${position}`);
    }
  };

  private handlePointerUp = (e: Event): void => {
    const pe = e as PointerEvent;

    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }

    if (this.draggedNodeId) {
      // Release capture. Target might have been removed or changed, so handle carefully.
      const target = pe.target as HTMLElement;
      if (target.hasPointerCapture && target.hasPointerCapture(pe.pointerId)) {
        target.releasePointerCapture(pe.pointerId);
      }
    }

    // Determine drop target before we clear states
    let nodeEl: HTMLElement | null = null;
    if (this.draggedNodeId && this.isDragging) {
      const targetElement = document.elementFromPoint(pe.clientX, pe.clientY) as HTMLElement;
      if (targetElement) {
        nodeEl = targetElement.closest('.mindmap-node') as HTMLElement;
      }
    }

    // Remove drag-over class from all nodes to be safe
    this.container.querySelectorAll('.mindmap-node').forEach((el) => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
    });

    if (this.isReadOnly) {
      this.draggedNodeId = null;
      this.isDragging = false;
      this.startPosition = null;
      return;
    }

    if (nodeEl && nodeEl.dataset.id && this.draggedNodeId && this.isDragging) {
      const targetId = nodeEl.dataset.id;
      if (this.draggedNodeId !== targetId) {
        const position = this.getDropPosition(pe, nodeEl);
        this.commandBus.dispatch({
          type: 'dropNode',
          draggedId: this.draggedNodeId,
          targetId: targetId,
          position,
        });
      }
    }

    this.draggedNodeId = null;
    this.isDragging = false;
    this.startPosition = null;
  };

  private createGhostElement(pe: PointerEvent): void {
    if (!this.draggedNodeId) return;
    const nodeEl = this.container.querySelector(`[data-id="${this.draggedNodeId}"]`) as HTMLElement;
    if (!nodeEl) return;

    this.ghostElement = nodeEl.cloneNode(true) as HTMLElement;
    this.ghostElement.classList.add('kakidash-drag-ghost');
    this.ghostElement.style.position = 'fixed';
    this.ghostElement.style.pointerEvents = 'none'; // so elementFromPoint works
    this.ghostElement.style.opacity = '0.7';
    this.ghostElement.style.zIndex = '9999';
    this.ghostElement.style.margin = '0';
    this.ghostElement.style.left = `${pe.clientX}px`;
    this.ghostElement.style.top = `${pe.clientY}px`;
    this.ghostElement.style.transform = 'translate(-50%, -50%)'; // center on pointer
    document.body.appendChild(this.ghostElement);
  }

  private getDropPosition(
    pe: PointerEvent,
    element: HTMLElement,
  ): 'top' | 'bottom' | 'left' | 'right' {
    const rect = element.getBoundingClientRect();
    const x = pe.clientX - rect.left;
    const y = pe.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    if (y < h * 0.25) return 'top';
    if (y > h * 0.75) return 'bottom';
    if (x < w * 0.25) return 'left';
    if (x > w * 0.75) return 'right';

    return 'right';
  }
}
