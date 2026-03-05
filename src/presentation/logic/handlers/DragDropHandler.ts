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
    const handleDragStart = (e: Event) => this.handleDragStart(e);
    const handleDragOver = (e: Event) => this.handleDragOver(e);
    const handleDragLeave = (e: Event) => this.handleDragLeave(e);
    const handleDrop = (e: Event) => this.handleDrop(e);
    const handleDragEnd = () => this.handleDragEnd();

    this.container.addEventListener('dragstart', handleDragStart);
    this.cleanupFns.push(() => this.container.removeEventListener('dragstart', handleDragStart));

    this.container.addEventListener('dragover', handleDragOver);
    this.cleanupFns.push(() => this.container.removeEventListener('dragover', handleDragOver));

    this.container.addEventListener('dragleave', handleDragLeave);
    this.cleanupFns.push(() => this.container.removeEventListener('dragleave', handleDragLeave));

    this.container.addEventListener('drop', handleDrop);
    this.cleanupFns.push(() => this.container.removeEventListener('drop', handleDrop));

    this.container.addEventListener('dragend', handleDragEnd);
    this.cleanupFns.push(() => this.container.removeEventListener('dragend', handleDragEnd));
  }

  private handleDragStart = (e: Event): void => {
    const de = e as DragEvent;
    if (this.isReadOnly) {
      de.preventDefault();
      return;
    }
    const target = de.target as HTMLElement;
    const nodeEl = target.closest('.mindmap-node') as HTMLElement;
    if (nodeEl && nodeEl.dataset.id) {
      this.draggedNodeId = nodeEl.dataset.id;
      de.dataTransfer?.setData('text/plain', nodeEl.dataset.id);
      if (de.dataTransfer) {
        de.dataTransfer.effectAllowed = 'move';
      }
    }
  };

  private handleDragOver = (e: Event): void => {
    const de = e as DragEvent;
    if (this.isReadOnly) return;
    de.preventDefault(); // Allow drop
    const target = de.target as HTMLElement;
    const nodeEl = target.closest('.mindmap-node') as HTMLElement;

    if (
      nodeEl &&
      nodeEl.dataset.id &&
      this.draggedNodeId &&
      nodeEl.dataset.id !== this.draggedNodeId
    ) {
      const position = this.getDropPosition(de, nodeEl);

      // Clear all classes first
      nodeEl.classList.remove(
        'drag-over-top',
        'drag-over-bottom',
        'drag-over-left',
        'drag-over-right',
      );
      nodeEl.classList.add(`drag-over-${position}`);

      if (de.dataTransfer) {
        de.dataTransfer.dropEffect = 'move';
      }
    }
  };

  private handleDragLeave = (e: Event): void => {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest('.mindmap-node') as HTMLElement;
    if (nodeEl) {
      nodeEl.classList.remove(
        'drag-over-top',
        'drag-over-bottom',
        'drag-over-left',
        'drag-over-right',
      );
    }
  };

  private handleDrop = (e: Event): void => {
    const de = e as DragEvent;
    de.preventDefault();
    const target = de.target as HTMLElement;
    const nodeEl = target.closest('.mindmap-node') as HTMLElement;

    // Remove drag-over class from all nodes to be safe
    this.container.querySelectorAll('.mindmap-node').forEach((el) => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
    });

    if (this.isReadOnly) return;

    if (nodeEl && nodeEl.dataset.id && this.draggedNodeId) {
      const targetId = nodeEl.dataset.id;
      if (this.draggedNodeId !== targetId) {
        const position = this.getDropPosition(de, nodeEl);
        this.commandBus.dispatch({
          type: 'dropNode',
          draggedId: this.draggedNodeId,
          targetId: targetId,
          position,
        });
      }
    }
    this.draggedNodeId = null;
  };

  private handleDragEnd = (): void => {
    this.draggedNodeId = null;
    this.container.querySelectorAll('.mindmap-node').forEach((el) => {
      el.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
    });
  };

  private getDropPosition(e: DragEvent, element: HTMLElement): 'top' | 'bottom' | 'left' | 'right' {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    if (y < h * 0.25) return 'top';
    if (y > h * 0.75) return 'bottom';
    if (x < w * 0.25) return 'left';
    if (x > w * 0.75) return 'right';

    return 'right';
  }
}
