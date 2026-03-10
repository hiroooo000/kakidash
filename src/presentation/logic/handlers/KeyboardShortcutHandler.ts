import {
  ShortcutAction,
  ShortcutConfig,
  DEFAULT_SHORTCUTS,
} from '../../../features/core/domain/ShortcutConfig';
import { CommandBus } from '../../commands/CommandBus';
import { ShortcutManager } from '../ShortcutManager';

export interface KeyboardShortcutHandlerDeps {
  commandBus: CommandBus;
  container: HTMLElement;
  shortcuts?: ShortcutConfig;
}

export class KeyboardShortcutHandler {
  private commandBus: CommandBus;
  private container: HTMLElement;
  private shortcutManager: ShortcutManager;
  private isReadOnly: boolean = false;
  private shortcuts: ShortcutConfig;
  private getSelectedNodeId: () => string | null;

  private cleanupFns: Array<() => void> = [];

  constructor(deps: KeyboardShortcutHandlerDeps, getSelectedNodeId: () => string | null) {
    this.commandBus = deps.commandBus;
    this.container = deps.container;
    this.shortcuts = { ...DEFAULT_SHORTCUTS, ...deps.shortcuts };
    this.shortcutManager = new ShortcutManager(this.shortcuts);
    this.getSelectedNodeId = getSelectedNodeId;

    this.attachEvents();
  }

  getShortcuts(): ShortcutConfig {
    return this.shortcuts;
  }

  setReadOnly(readOnly: boolean): void {
    this.isReadOnly = readOnly;
  }

  destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  private attachEvents(): void {
    const handleKeyDown = (e: Event) => {
      console.log(`[KeyboardShortcutHandler] RAW KEYDOWN: ${(e as KeyboardEvent).key}`);
      if (this.isReadOnly) return;
      const ke = e as KeyboardEvent;
      const target = ke.target as HTMLElement;

      console.log(`[KeyboardShortcutHandler] Target: ${target ? target.tagName : 'unknown'}`);

      // Safety check for input elements
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      const selectedNodeId = this.getSelectedNodeId();
      console.log(`[KeyboardShortcutHandler] Selected ID: ${selectedNodeId}`);

      // Handle No Selection (Initial Focus)
      if (!selectedNodeId) {
        if (this.shortcutManager.matches(ke, 'navUp')) {
          ke.preventDefault();
          this.commandBus.dispatch({ type: 'navigate', nodeId: null, direction: 'Up' });
          return;
        }
        if (this.shortcutManager.matches(ke, 'navDown')) {
          ke.preventDefault();
          this.commandBus.dispatch({ type: 'navigate', nodeId: null, direction: 'Down' });
          return;
        }
        if (this.shortcutManager.matches(ke, 'navLeft')) {
          ke.preventDefault();
          this.commandBus.dispatch({ type: 'navigate', nodeId: null, direction: 'Left' });
          return;
        }
        if (this.shortcutManager.matches(ke, 'navRight')) {
          ke.preventDefault();
          this.commandBus.dispatch({ type: 'navigate', nodeId: null, direction: 'Right' });
          return;
        }
      }

      // Actions
      const action = this.shortcutManager.getAction(ke);
      if (action) {
        this.handleAction(action, ke, selectedNodeId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    this.cleanupFns.push(() => {
      document.removeEventListener('keydown', handleKeyDown);
    });
  }

  private handleAction(
    action: ShortcutAction,
    ke: KeyboardEvent,
    selectedNodeId: string | null,
  ): void {
    // 1. Actions allowed WITHOUT selection
    switch (action) {
      case 'undo':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'undo' });
        return;
      case 'redo':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'redo' });
        return;
      case 'zoomIn': {
        ke.preventDefault();
        // Container rect depends on current DOM
        const rectIn = this.container.getBoundingClientRect();
        this.commandBus.dispatch({
          type: 'zoom',
          delta: -100,
          x: rectIn.left + rectIn.width / 2,
          y: rectIn.top + rectIn.height / 2,
        });
        return;
      }
      case 'zoomOut': {
        ke.preventDefault();
        const rectOut = this.container.getBoundingClientRect();
        this.commandBus.dispatch({
          type: 'zoom',
          delta: 100,
          x: rectOut.left + rectOut.width / 2,
          y: rectOut.top + rectOut.height / 2,
        });
        return;
      }
      case 'resetZoom':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'zoomReset' });
        return;
      case 'openCommandPalette':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'toggleCommandPalette' });
        return;
    }

    // 2. Guard for selection
    if (!selectedNodeId) return;

    // 3. Actions allowed in ReadOnly (requiring selection)
    switch (action) {
      case 'copy':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'copyNode', nodeId: selectedNodeId });
        return;
      case 'paste':
        // Do NOT preventDefault here, so the browser's 'paste' event can fire for image handling
        this.commandBus.dispatch({ type: 'pasteNode', parentId: selectedNodeId });
        return;
      case 'navUp':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'navigate',
          nodeId: selectedNodeId,
          direction: 'Up',
          extendSelection: ke.shiftKey,
        });
        return;
      case 'navDown':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'navigate',
          nodeId: selectedNodeId,
          direction: 'Down',
          extendSelection: ke.shiftKey,
        });
        return;
      case 'navRight':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'navigate',
          nodeId: selectedNodeId,
          direction: 'Right',
          extendSelection: ke.shiftKey,
        });
        return;
      case 'navLeft':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'navigate',
          nodeId: selectedNodeId,
          direction: 'Left',
          extendSelection: ke.shiftKey,
        });
        return;
    }

    if (this.isReadOnly) return;

    // 4. Actions blocked in ReadOnly (requiring selection)
    switch (action) {
      case 'addChild':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'addNode', parentId: selectedNodeId });
        break;
      case 'insertParent':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'insertParent', nodeId: selectedNodeId });
        break;
      case 'addSibling':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'addSibling', nodeId: selectedNodeId, position: 'after' });
        break;
      case 'addSiblingBefore':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'addSibling',
          nodeId: selectedNodeId,
          position: 'before',
        });
        break;
      case 'deleteNode':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'deleteNode', nodeId: selectedNodeId });
        break;
      case 'beginEdit':
        ke.preventDefault();
        console.log(`[KeyboardShortcutHandler] beginEdit triggered for ${selectedNodeId}`);
        this.commandBus.dispatch({ type: 'editNode', nodeId: selectedNodeId });
        break;
      case 'cut':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'cutNode', nodeId: selectedNodeId });
        break;
      case 'bold':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'styleAction',
          nodeId: selectedNodeId,
          action: { type: 'bold' },
        });
        break;
      case 'italic':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'styleAction',
          nodeId: selectedNodeId,
          action: { type: 'italic' },
        });
        break;
      case 'strikethrough':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'styleAction',
          nodeId: selectedNodeId,
          action: { type: 'strikethrough' },
        });
        break;
      case 'increaseFontSize':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'styleAction',
          nodeId: selectedNodeId,
          action: { type: 'increaseSize' },
        });
        break;
      case 'decreaseFontSize':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'styleAction',
          nodeId: selectedNodeId,
          action: { type: 'decreaseSize' },
        });
        break;
      case 'toggleFold':
        ke.preventDefault();
        this.commandBus.dispatch({ type: 'toggleFold', nodeId: selectedNodeId });
        break;
      case 'increaseNodeWidth':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'updateNodeWidth',
          nodeId: selectedNodeId,
          increment: 20,
        });
        break;
      case 'decreaseNodeWidth':
        ke.preventDefault();
        this.commandBus.dispatch({
          type: 'updateNodeWidth',
          nodeId: selectedNodeId,
          increment: -20,
        });
        break;
      default:
        // Handle dynamic color actions
        if (action.startsWith('selectColor')) {
          const index = parseInt(action.replace('selectColor', ''), 10) - 1;
          if (!isNaN(index)) {
            ke.preventDefault();
            this.commandBus.dispatch({
              type: 'styleAction',
              nodeId: selectedNodeId,
              action: { type: 'color', index },
            });
          }
        }
        break;
    }
  }
}
