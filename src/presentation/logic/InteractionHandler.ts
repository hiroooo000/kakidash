import {
  ShortcutConfig,
  DEFAULT_SHORTCUTS,
  ShortcutAction,
} from '../../features/core/domain/ShortcutConfig';
import { NodeEditor } from '../components/NodeEditor';
import { NodeDragger } from './NodeDragger';
import { ShortcutManager } from './ShortcutManager';

import { InteractionOptions } from '../types/InteractionOptions';

export class InteractionHandler {
  container: HTMLElement;
  options: InteractionOptions;
  maxWidth: number = -1;
  selectedNodeId: string | null = null;

  isPanning: boolean = false;
  lastMouseX: number = 0;
  lastMouseY: number = 0;
  isReadOnly: boolean = false;
  private shortcuts: ShortcutConfig;
  private nodeEditor: NodeEditor;
  private nodeDragger: NodeDragger;
  private shortcutManager: ShortcutManager;

  private cleanupFns: Array<() => void> = [];

  constructor(container: HTMLElement, options: InteractionOptions) {
    this.container = container;
    // Make container focusable to capture keyboard/paste events
    this.container.tabIndex = 0;
    this.container.style.outline = 'none';
    this.container.style.cursor = 'default';
    this.options = options;
    this.shortcuts = { ...DEFAULT_SHORTCUTS, ...options.shortcuts };
    this.nodeEditor = new NodeEditor(container, this.maxWidth, options);
    this.nodeDragger = new NodeDragger(container, options);
    this.shortcutManager = new ShortcutManager(this.shortcuts);

    // Initialize ReadOnly state
    this.isReadOnly = !!options.allowReadOnly;
    this.nodeDragger.setReadOnly(this.isReadOnly);

    this.attachEvents();
  }

  getShortcuts(): ShortcutConfig {
    return this.shortcuts;
  }

  setReadOnly(readOnly: boolean): void {
    this.isReadOnly = readOnly;
    // Update NodeDragger state
    if (this.nodeDragger) {
      this.nodeDragger.setReadOnly(readOnly);
    }

    // Maybe cancel any ongoing edit/drag?
    if (readOnly) {
      if (this.nodeDragger && this.nodeDragger.draggedNodeId) {
        this.nodeDragger.draggedNodeId = null;
      }
      // If editing is happening... we can't easily cancel internal state of textarea,
      // but new edits are blocked.
    }
  }

  destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  updateSelection(nodeId: string | null) {
    this.selectedNodeId = nodeId;
  }

  private attachEvents(): void {
    // Paste logic is handled by 'paste' event listener solely

    // Helper to add listener and track cleanup
    const addListener = (
      target: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      target.addEventListener(type, listener, options);
      this.cleanupFns.push(() => {
        if (typeof target.removeEventListener === 'function') {
          target.removeEventListener(type, listener, options);
        }
      });
    };

    addListener(this.container, 'focus', () => {});
    addListener(this.container, 'blur', () => {});

    // Prevent accidental scrolling of the container (we use transform for pan)
    addListener(this.container, 'scroll', () => {
      if (this.container.scrollTop !== 0 || this.container.scrollLeft !== 0) {
        this.container.scrollTop = 0;
        this.container.scrollLeft = 0;
      }
    });

    // Click handling
    addListener(this.container, 'click', (e) => {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;

      if (nodeEl && nodeEl.dataset.id) {
        this.options.onNodeClick(nodeEl.dataset.id, (e as MouseEvent).shiftKey);
      } else {
        // Deselect if clicking background
        this.options.onNodeClick('');
      }

      // Ensure container receives/retains focus AFTER render might have occurred
      this.container.focus();
    });

    // Pan handling
    addListener(this.container, 'mousedown', (e) => {
      const me = e as MouseEvent;
      const target = me.target as HTMLElement;
      // Only start panning if clicking background (not a node/input)
      if (!target.closest('.mindmap-node') && target.tagName !== 'INPUT') {
        this.isPanning = true;
        this.lastMouseX = me.clientX;
        this.lastMouseY = me.clientY;
        this.container.style.cursor = 'all-scroll';
      }
    });

    addListener(window, 'mousemove', (e) => {
      const me = e as MouseEvent;
      if (this.isPanning) {
        const dx = me.clientX - this.lastMouseX;
        const dy = me.clientY - this.lastMouseY;
        this.lastMouseX = me.clientX;
        this.lastMouseY = me.clientY;

        if (this.options.onPan) {
          this.options.onPan(dx, dy);
        }
      }
    });

    const stopPanning = () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.container.style.cursor = 'default';
      }
    };

    addListener(window, 'mouseup', stopPanning);
    addListener(window, 'mouseleave', stopPanning);

    // Wheel handling (Pan)
    addListener(
      this.container,
      'wheel',
      (e) => {
        const we = e as WheelEvent;
        we.preventDefault();

        // Check for Zoom (Ctrl/Meta + Wheel)
        if (we.ctrlKey || we.metaKey) {
          if (this.options.onZoom) {
            this.options.onZoom(we.deltaY, we.clientX, we.clientY);
          }
          return;
        }

        // Normalize delta based on deltaMode
        // 0: Pixel, 1: Line, 2: Page
        let multiplier = 1;
        if (we.deltaMode === 1) {
          // Line
          multiplier = 33; // Approx line height in pixels
        } else if (we.deltaMode === 2) {
          // Page
          multiplier = window.innerHeight;
        }

        const dx = -we.deltaX * multiplier;
        const dy = -we.deltaY * multiplier;

        if (this.options.onPan) {
          this.options.onPan(dx, dy);
        }
      },
      { passive: false },
    );

    // Keyboard handling
    addListener(document, 'keydown', (e) => {
      const ke = e as KeyboardEvent;
      const target = ke.target as HTMLElement;

      // Log for debugging
      if (ke.key === 'z' && (ke.ctrlKey || ke.metaKey)) {
        console.log('InteractionHandler: Ctrl+Z detected', {
          selectedNodeId: this.selectedNodeId,
          isReadOnly: this.isReadOnly,
          target: target.tagName,
        });
      }

      // START CHANGE: Safety check for input elements
      // ... (existing check)
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // ...

      // Handle No Selection (Initial Focus)
      if (!this.selectedNodeId) {
        if (this.shortcutManager.matches(ke, 'navUp')) {
          ke.preventDefault();
          this.options.onNavigate?.(null, 'Up');
          return;
        }
        if (this.shortcutManager.matches(ke, 'navDown')) {
          ke.preventDefault();
          this.options.onNavigate?.(null, 'Down');
          return;
        }
        if (this.shortcutManager.matches(ke, 'navLeft')) {
          ke.preventDefault();
          this.options.onNavigate?.(null, 'Left');
          return;
        }
        if (this.shortcutManager.matches(ke, 'navRight')) {
          ke.preventDefault();
          this.options.onNavigate?.(null, 'Right');
          return;
        }

        // Allow Undo/Redo/Zoom even without selection
        // But block other actions?
        // Logic below checks action and returns if !this.selectedNodeId except for specific cases.
      }

      // Actions
      const action = this.shortcutManager.getAction(ke);
      if (action) {
        console.log('InteractionHandler: Action matched', action);
        this.handleAction(action, ke);
      }
    });

    // Paste handling (Image & Node)
    addListener(document, 'paste', (e) => {
      const ce = e as ClipboardEvent;
      // Native paste event

      if (this.isReadOnly) return;
      if (!this.selectedNodeId) return;

      const clipboardItems = ce.clipboardData?.items;

      if (!clipboardItems || clipboardItems.length === 0) {
        // No clipboard data, fallback to internal paste
        this.options.onPasteNode?.(this.selectedNodeId);
        return;
      }

      let processed = false;
      for (const item of clipboardItems) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result && this.options.onPasteImage && this.selectedNodeId) {
                const result = event.target.result as string;
                const img = new Image();
                img.onload = () => {
                  if (this.selectedNodeId && this.options.onPasteImage) {
                    this.options.onPasteImage(
                      this.selectedNodeId,
                      result,
                      img.naturalWidth,
                      img.naturalHeight,
                    );
                  }
                };
                img.src = result;
              }
            };
            reader.readAsDataURL(blob);
          }
          ce.preventDefault();
          processed = true;
          break;
        }
      }

      if (!processed) {
        // If no image was found/handled, assume it might be a node copy (internal)
        this.options.onPasteNode?.(this.selectedNodeId);
      }
    });

    // Drag & Drop handling
    const addListenerHelper = (
      target: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => addListener(target, type, listener);

    addListenerHelper(
      this.container,
      'dragstart',
      this.nodeDragger.handleDragStart.bind(this.nodeDragger),
    );
    addListenerHelper(
      this.container,
      'dragover',
      this.nodeDragger.handleDragOver.bind(this.nodeDragger),
    );
    addListenerHelper(
      this.container,
      'dragleave',
      this.nodeDragger.handleDragLeave.bind(this.nodeDragger),
    );
    addListenerHelper(this.container, 'drop', this.nodeDragger.handleDrop.bind(this.nodeDragger));
    addListenerHelper(
      this.container,
      'dragend',
      this.nodeDragger.handleDragEnd.bind(this.nodeDragger),
    );

    // Double click to edit
    addListener(this.container, 'dblclick', (e) => {
      if (this.isReadOnly) return;
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.mindmap-node') as HTMLElement;

      if (nodeEl && nodeEl.dataset.id) {
        this.startEditing(nodeEl, nodeEl.dataset.id);
      }
    });
  }

  public editNode(nodeId: string): void {
    const nodeEl = this.container.querySelector(
      `.mindmap-node[data-id="${nodeId}"]`,
    ) as HTMLElement;
    if (nodeEl) {
      this.startEditing(nodeEl, nodeId);
    }
  }

  get draggedNodeId(): string | null {
    return this.nodeDragger ? this.nodeDragger.draggedNodeId : null;
  }
  set draggedNodeId(value: string | null) {
    if (this.nodeDragger) this.nodeDragger.draggedNodeId = value;
  }

  private startEditing(element: HTMLElement, nodeId: string): void {
    this.nodeEditor.setMaxWidth(this.maxWidth);
    this.nodeEditor.startEditing(element, nodeId);
  }

  private handleAction(action: ShortcutAction, ke: KeyboardEvent): void {
    // 1. Actions allowed WITHOUT selection
    switch (action) {
      case 'undo':
        ke.preventDefault();
        this.options.onUndo?.();
        return;
      case 'redo':
        ke.preventDefault();
        this.options.onRedo?.();
        return;
      case 'zoomIn':
        ke.preventDefault();
        if (this.options.onZoom) {
          const rect = this.container.getBoundingClientRect();
          this.options.onZoom(-100, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        return;
      case 'zoomOut':
        ke.preventDefault();
        if (this.options.onZoom) {
          const rect = this.container.getBoundingClientRect();
          this.options.onZoom(100, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        return;
      case 'resetZoom': // shortcutManager might map this, or it's handled in keydown? handled in keydown usually but good to have here if mapped
        // In keydown we check match(ke, 'resetZoom') explicitly before getAction.
        // But if getAction returns it, handle it.
        ke.preventDefault();
        this.options.onZoomReset?.();
        return;
      case 'openCommandPalette':
        ke.preventDefault();
        this.options.onToggleCommandPalette?.();
        return;
    }

    // 2. Guard for selection
    if (!this.selectedNodeId) return;

    // 3. Actions allowed in ReadOnly (requiring selection)
    switch (action) {
      case 'copy':
        ke.preventDefault();
        this.options.onCopyNode?.(this.selectedNodeId);
        return;
      case 'navUp':
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Up', ke.shiftKey);
        return;
      case 'navDown':
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Down', ke.shiftKey);
        return;
      case 'navRight':
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Right', ke.shiftKey);
        return;
      case 'navLeft':
        ke.preventDefault();
        this.options.onNavigate?.(this.selectedNodeId, 'Left', ke.shiftKey);
        return;
    }

    if (this.isReadOnly) return;

    // 4. Actions blocked in ReadOnly (requiring selection)
    switch (action) {
      case 'addChild':
        ke.preventDefault();
        this.options.onAddChild(this.selectedNodeId);
        break;
      case 'insertParent':
        ke.preventDefault();
        this.options.onInsertParent?.(this.selectedNodeId);
        break;
      case 'addSibling':
        ke.preventDefault();
        this.options.onAddSibling(this.selectedNodeId, 'after');
        break;
      case 'addSiblingBefore':
        ke.preventDefault();
        this.options.onAddSibling(this.selectedNodeId, 'before');
        break;
      case 'deleteNode':
        ke.preventDefault();
        this.options.onDeleteNode(this.selectedNodeId);
        break;
      case 'beginEdit':
        ke.preventDefault();
        this.handleBeginEdit();
        break;
      case 'cut':
        ke.preventDefault();
        this.options.onCutNode?.(this.selectedNodeId);
        break;
      case 'bold':
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'bold' });
        break;
      case 'italic':
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'italic' });
        break;
      case 'increaseFontSize':
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'increaseSize' });
        break;
      case 'decreaseFontSize':
        ke.preventDefault();
        this.options.onStyleAction?.(this.selectedNodeId, { type: 'decreaseSize' });
        break;
      case 'toggleFold':
        ke.preventDefault();
        this.options.onToggleFold?.(this.selectedNodeId);
        break;
      case 'increaseNodeWidth':
        ke.preventDefault();
        this.options.onUpdateNodeWidth?.(this.selectedNodeId, 20);
        break;
      case 'decreaseNodeWidth':
        ke.preventDefault();
        this.options.onUpdateNodeWidth?.(this.selectedNodeId, -20);
        break;
      default:
        // Handle dynamic color actions
        if (action.startsWith('selectColor')) {
          const index = parseInt(action.replace('selectColor', ''), 10) - 1;
          if (!isNaN(index)) {
            ke.preventDefault();
            this.options.onStyleAction?.(this.selectedNodeId, { type: 'color', index });
          }
        }
        break;
    }
  }

  private handleBeginEdit(): void {
    if (!this.selectedNodeId) return;
    const selectedNodeEl = this.container.querySelector(
      `.mindmap-node[data-id="${this.selectedNodeId}"]`,
    ) as HTMLElement;
    if (selectedNodeEl) {
      // Restore Zoom: Check if image node mechanism
      const zoomBtn = selectedNodeEl.querySelector('[title="Zoom Image"]') as HTMLElement;
      if (zoomBtn) {
        zoomBtn.click();
        return;
      }
      if (selectedNodeEl.querySelector('img')) {
        return;
      }
      this.startEditing(selectedNodeEl, this.selectedNodeId);
    }
  }
}
