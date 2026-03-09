import { InteractionOptions } from '../types/InteractionOptions';

export class NodeDragger {
  private container: HTMLElement;
  private options: InteractionOptions;
  public draggedNodeId: string | null = null;
  private isReadOnly: boolean = false;
  private ghostElement: HTMLElement | null = null;

  constructor(container: HTMLElement, options: InteractionOptions) {
    this.container = container;
    this.options = options;
    this.injectDragStyles();
  }

  public setReadOnly(readOnly: boolean): void {
    this.isReadOnly = readOnly;
  }

  private injectDragStyles(): void {
    const style = document.createElement('style');
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
  }

  public handlePointerDown(e: Event): void {
    const pe = e as PointerEvent;
    if (this.isReadOnly) {
      return;
    }
    const target = pe.target as HTMLElement;
    const nodeEl = target.closest('.mindmap-node') as HTMLElement;
    if (nodeEl && nodeEl.dataset.id) {
      this.draggedNodeId = nodeEl.dataset.id;
      nodeEl.setPointerCapture(pe.pointerId);

      this.ghostElement = nodeEl.cloneNode(true) as HTMLElement;
      this.ghostElement.classList.add('kakidash-drag-ghost');
      this.ghostElement.style.position = 'fixed';
      this.ghostElement.style.pointerEvents = 'none';
      this.ghostElement.style.opacity = '0.7';
      this.ghostElement.style.zIndex = '9999';
      this.ghostElement.style.margin = '0';
      this.ghostElement.style.left = `${pe.clientX}px`;
      this.ghostElement.style.top = `${pe.clientY}px`;
      this.ghostElement.style.transform = 'translate(-50%, -50%)';
      document.body.appendChild(this.ghostElement);
    }
  }

  public handlePointerMove(e: Event): void {
    const pe = e as PointerEvent;
    if (this.isReadOnly || !this.draggedNodeId) return;

    if (this.ghostElement) {
      this.ghostElement.style.left = `${pe.clientX}px`;
      this.ghostElement.style.top = `${pe.clientY}px`;
    }

    const targetElement = document.elementFromPoint(pe.clientX, pe.clientY) as HTMLElement;
    if (!targetElement) return;

    const nodeEl = targetElement.closest('.mindmap-node') as HTMLElement;

    this.container.querySelectorAll('.mindmap-node').forEach((el) => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
    });

    if (nodeEl && nodeEl.dataset.id && nodeEl.dataset.id !== this.draggedNodeId) {
      const position = this.getDropPosition(pe, nodeEl);
      nodeEl.classList.add(`drag-over-${position}`);
    }
  }

  public handlePointerUp(e: Event): void {
    const pe = e as PointerEvent;

    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }

    if (this.draggedNodeId) {
      const target = pe.target as HTMLElement;
      if (target.hasPointerCapture && target.hasPointerCapture(pe.pointerId)) {
        target.releasePointerCapture(pe.pointerId);
      }
    }

    let nodeEl: HTMLElement | null = null;
    if (this.draggedNodeId) {
      const targetElement = document.elementFromPoint(pe.clientX, pe.clientY) as HTMLElement;
      if (targetElement) {
        nodeEl = targetElement.closest('.mindmap-node') as HTMLElement;
      }
    }

    this.container.querySelectorAll('.mindmap-node').forEach((el) => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
    });

    if (this.isReadOnly) {
      this.draggedNodeId = null;
      return;
    }

    if (nodeEl && nodeEl.dataset.id && this.draggedNodeId) {
      const targetId = nodeEl.dataset.id;
      if (this.draggedNodeId !== targetId) {
        const position = this.getDropPosition(pe, nodeEl);
        this.options.onDropNode(this.draggedNodeId, targetId, position);
      }
    }

    this.draggedNodeId = null;
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
