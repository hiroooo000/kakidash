import { CommandBus } from '../commands/CommandBus';
import { KeyboardShortcutHandler } from './handlers/KeyboardShortcutHandler';
import { ZoomPanHandler } from './handlers/ZoomPanHandler';
import { DragDropHandler } from './handlers/DragDropHandler';
import { InteractionOptions } from '../types/InteractionOptions';
import { NodeEditor } from '../components/NodeEditor';

import { MindMap } from '../../features/core/domain/MindMap';

export interface InteractionOrchestratorDeps {
  container: HTMLElement;
  options: InteractionOptions;
  commandBus: CommandBus;
  mindMap: MindMap;
  getSelectedNodeId: () => string | null;
  getNodeElement: (nodeId: string) => HTMLElement | undefined;
  zoomNode: (nodeId: string) => void;
}

export class InteractionOrchestrator {
  private container: HTMLElement;
  private commandBus: CommandBus;
  private mindMap: MindMap;
  public readonly options: InteractionOptions;

  private keyboardHandler: KeyboardShortcutHandler;
  private zoomPanHandler: ZoomPanHandler;
  private dragDropHandler: DragDropHandler;
  private nodeEditor: NodeEditor;

  private cleanupFns: Array<() => void> = [];
  private isReadOnly: boolean = false;
  private _maxWidth: number = -1;
  private _getNodeElement: (nodeId: string) => HTMLElement | undefined;
  private _zoomNode: (nodeId: string) => void;
  private getSelectedNodeId: () => string | null;

  constructor(deps: InteractionOrchestratorDeps) {
    this.container = deps.container;
    this.commandBus = deps.commandBus;
    this.mindMap = deps.mindMap;
    this.options = deps.options;
    this._getNodeElement = deps.getNodeElement;
    this._zoomNode = deps.zoomNode;
    this.getSelectedNodeId = deps.getSelectedNodeId;

    // Initialize container properties
    this.container.tabIndex = 0;
    this.container.style.outline = 'none';
    this.container.style.cursor = 'default';

    this.isReadOnly = !!deps.options.allowReadOnly;

    // Initialize handlers
    this.keyboardHandler = new KeyboardShortcutHandler(
      {
        commandBus: this.commandBus,
        container: this.container,
        shortcuts: this.options.shortcuts,
      },
      deps.getSelectedNodeId,
    );
    this.zoomPanHandler = new ZoomPanHandler({
      commandBus: this.commandBus,
      container: this.container,
    });
    this.dragDropHandler = new DragDropHandler({
      commandBus: this.commandBus,
      container: this.container,
    });
    this.dragDropHandler.setReadOnly(this.isReadOnly);

    this.nodeEditor = new NodeEditor(this.container, this._maxWidth, this.commandBus);

    this.attachEvents();
  }

  public get isReadOnlyState(): boolean {
    return this.isReadOnly;
  }

  public getShortcuts(): import('../../../src/features/core/domain/ShortcutConfig').ShortcutConfig {
    return this.keyboardHandler.getShortcuts();
  }

  public setReadOnly(readOnly: boolean): void {
    this.isReadOnly = readOnly;
    this.dragDropHandler.setReadOnly(readOnly);
  }

  public focus(): void {
    this.container.focus();
  }

  public set maxWidth(width: number) {
    this._maxWidth = width;
    this.nodeEditor.setMaxWidth(width);
  }

  public get maxWidth(): number {
    return this._maxWidth;
  }

  public editNode(nodeId: string): void {
    const nodeEl = this.getNodeElement(nodeId);
    if (nodeEl) {
      this.startEditing(nodeEl, nodeId);
    }
  }

  public getNodeElement(nodeId: string): HTMLElement | undefined {
    return this._getNodeElement(nodeId);
  }

  public zoomNode(nodeId: string): void {
    this._zoomNode(nodeId);
  }

  public updateSelection(_nodeId: string | null): void {}

  public destroy(): void {
    this.keyboardHandler.destroy();
    this.zoomPanHandler.destroy();
    this.dragDropHandler.destroy();
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  private attachEvents(): void {
    const addListener = (
      target: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      target.addEventListener(type, listener, options);
      this.cleanupFns.push(() => {
        target.removeEventListener(type, listener, options);
      });
    };

    // Prevent accidental scrolling
    addListener(this.container, 'scroll', () => {
      if (this.container.scrollTop !== 0 || this.container.scrollLeft !== 0) {
        this.container.scrollTop = 0;
        this.container.scrollLeft = 0;
      }
    });

    // Click handling (deselect / select)
    addListener(this.container, 'click', (e) => {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;

      if (nodeEl && nodeEl.dataset.id) {
        this.commandBus.dispatch({
          type: 'selectNode',
          nodeId: nodeEl.dataset.id,
          extendSelection: (e as MouseEvent).shiftKey,
        });
      } else {
        this.commandBus.dispatch({ type: 'selectNode', nodeId: null });
      }

      this.container.focus();
    });

    // Double click to edit
    addListener(this.container, 'dblclick', (e) => {
      if (this.isReadOnly) return;
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;

      if (nodeEl && nodeEl.dataset.id) {
        const nodeId = nodeEl.dataset.id;
        const node = this.mindMap.findNode(nodeId);
        if (node && (node.thumbnail || node.image)) {
          this.zoomNode(nodeId);
        } else {
          this.startEditing(nodeEl, nodeId);
        }
      }
    });

    // Context menu
    addListener(this.container, 'contextmenu', (_e) => {
      // Potentially dispatch a command for context menu if needed
      // For now, let default happen or prevent it if desired.
    });

    // Paste handling (mainly for images, but now text as well)
    addListener(this.container, 'paste', (e) => {
      if (this.isReadOnly) return;
      const selectedId = this.getSelectedNodeId();
      if (!selectedId) return;

      const clipboardData = (e as ClipboardEvent).clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      let hasImage = false;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          hasImage = true;
          e.preventDefault(); // Prevent default so it's not pasted as text/blob elsewhere if applicable
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const imageData = event.target?.result as string;
              const img = new Image();
              img.onload = () => {
                this.commandBus.dispatch({
                  type: 'pasteImage',
                  parentId: selectedId,
                  imageData,
                  width: img.width,
                  height: img.height,
                });
              };
              img.src = imageData;
            };
            reader.readAsDataURL(file);
          }
        }
      }

      // If no image was found, handle as text paste
      if (!hasImage) {
        const text = clipboardData.getData('text/plain');
        if (text) {
          e.preventDefault();
          this.commandBus.dispatch({ type: 'pasteNode', parentId: selectedId, text });
        } else {
          // Fallback if there's no text but we still want to trigger the internal paste behavior
          e.preventDefault();
          this.commandBus.dispatch({ type: 'pasteNode', parentId: selectedId });
        }
      }
    });

    // Handle 'editNode' command from bus (e.g. if keyboard handler dispatches it)
    this.commandBus.on(
      'editNode',
      (command: Extract<import('../commands/Command').Command, { type: 'editNode' }>) => {
        this.editNode(command.nodeId);
      },
    );
  }

  private startEditing(element: HTMLElement, nodeId: string): void {
    const node = this.mindMap?.findNode(nodeId);
    if (node && node.image) {
      this.zoomNode(nodeId);
      return;
    }

    this.nodeEditor.startEditing(element, nodeId);
  }
}
