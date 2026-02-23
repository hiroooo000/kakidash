import { MindMap } from '../../features/core/domain/MindMap';
import { Node, NodeStyle } from '../../features/core/domain/Node';
import { MindMapService } from '../../features/core/application/MindMapService';
import { Renderer } from '../components/Renderer';
import { StyleEditor } from '../../features/theme/components/StyleEditor';
import { InteractionHandler } from './InteractionHandler';
import { Direction } from '../types/InteractionOptions';
import { LayoutMode } from '../../features/core/domain/LayoutMode';
import { LayoutSwitcher } from './LayoutSwitcher';
import { MindMapData, Theme } from '../../features/core/domain/MindMapData';
import { KakidashEventMap } from '../../features/core/domain/KakidashEvents';
import { MindMapStyles } from '../../features/theme/domain/MindMapStyles';
import { StyleAction } from '../../features/theme/domain/StyleAction';
import { CommandPalette, CustomCommand } from '../components/CommandPalette';
import { ThemeRegistry } from '../../features/theme/registry/ThemeRegistry';
import { XMindImporter } from '../../features/export_import/XMindImporter';
import { ImageExporter } from '../../features/export_import/ImageExporter';
import { MarkdownExporter } from '../../features/export_import/MarkdownExporter';
import { HelpModal } from '../components/HelpModal';
import { HistoryService } from '../../features/core/application/HistoryService';
import { ClipboardService } from '../../features/core/application/ClipboardService';
import { SearchService } from '../../features/core/application/SearchService';
import { FileHandler } from '../../shared/kernel/FileHandler';
import { ViewportService } from './ViewportService';
import { NavigationService } from './NavigationService';

export interface IMindMapEventBus {
  emit<K extends keyof KakidashEventMap>(event: K, payload: KakidashEventMap[K]): void;
  on<K extends keyof KakidashEventMap>(
    event: K,
    handler: (payload: KakidashEventMap[K]) => void,
  ): void;
  off<K extends keyof KakidashEventMap>(
    event: K,
    handler: (payload: KakidashEventMap[K]) => void,
  ): void;
}

/**
 * Dependencies required to construct a MindMapController.
 * Consolidates constructor parameters for readability.
 */
export interface ControllerDependencies {
  mindMap: MindMap;
  service: MindMapService;
  renderer: Renderer;
  styleEditor: StyleEditor;
  eventBus: IMindMapEventBus;
  historyService: HistoryService;
  clipboardService: ClipboardService;
  searchService: SearchService;
  viewportService: ViewportService;
  navigationService: NavigationService;
  fileHandler?: FileHandler;
  locale?: 'en' | 'ja';
  commandPaletteFeatures?: ('search' | 'icon' | 'import' | 'export')[];
}

export class MindMapController {
  private mindMap: MindMap;
  private service: MindMapService;
  private renderer: Renderer;
  private eventBus: IMindMapEventBus;
  private styleEditor: StyleEditor;
  private commandPalette: CommandPalette;
  private locale: 'en' | 'ja';
  private interactionHandler!: InteractionHandler;
  private layoutSwitcher!: LayoutSwitcher;
  private fileHandler?: FileHandler;

  private historyService: HistoryService;
  private clipboardService: ClipboardService;
  private searchService: SearchService;
  private viewportService: ViewportService;
  private navigationService: NavigationService;

  private anchorNodeId: string | null = null;
  private selectedNodeId: string | null = null;
  private selectedNodeIds: Set<string> = new Set();
  private layoutMode: LayoutMode = 'Right';

  private isBatching: boolean = false;
  private maxWidth: number = -1;

  private pendingNodeCreation: boolean = false;

  private savedCustomStyles: MindMapStyles = {
    rootNode: { border: '2px solid #aeb6bf', background: '#ebf5fb', color: '#2e4053' },
    childNode: { border: '1px solid #d5d8dc', background: '#fdfefe', color: '#2c3e50' },
    connection: { color: '#abb2b9' },
  };

  constructor(deps: ControllerDependencies) {
    this.mindMap = deps.mindMap;
    this.service = deps.service;
    this.renderer = deps.renderer;
    this.styleEditor = deps.styleEditor;
    this.eventBus = deps.eventBus;
    this.fileHandler = deps.fileHandler;

    this.historyService = deps.historyService;
    this.clipboardService = deps.clipboardService;
    this.searchService = deps.searchService;
    this.viewportService = deps.viewportService;
    this.navigationService = deps.navigationService;

    this.locale = deps.locale ?? 'en';
    this.commandPalette = new CommandPalette(this.renderer.container, {
      onInput: (query) => this.handleSearchInput(query),
      onSelect: (nodeId) => this.handleSearchResultSelect(nodeId),
      onIconSelect: (icon) => this.handleIconSelect(icon),
      onCommandSelect: (command) => this.handleCommandSelect(command),
      onClose: () => {
        if (this.interactionHandler) this.interactionHandler.container.focus();
      },
      getSelectedNodeId: () => this.selectedNodeId,
      disabledFeatures: deps.commandPaletteFeatures,
    });
  }

  public setInteractionHandler(handler: InteractionHandler) {
    this.interactionHandler = handler;
  }

  public setLayoutSwitcher(switcher: LayoutSwitcher) {
    this.layoutSwitcher = switcher;
  }

  public init(containerWidth: number) {
    this.viewportService.setInitialPan(containerWidth * 0.2, 0); // Default Right mode

    // Apply initial theme
    const theme = this.mindMap.theme;
    if (theme === 'custom') {
      const registry = ThemeRegistry.getInstance();
      registry.setCustomTheme(this.savedCustomStyles);
      registry.applyTheme(this.renderer.container, 'custom');
    } else {
      ThemeRegistry.getInstance().applyTheme(this.renderer.container, theme);
    }

    this.viewportService.startAnimationLoop();
    this.render();
  }

  public destroy() {
    this.viewportService.destroy();
  }

  // Data Persistence
  getData(): MindMapData {
    const data = this.service.exportData();
    data.selectedId = this.selectedNodeId || undefined;
    data.selectedIds = Array.from(this.selectedNodeIds);
    return data;
  }

  loadData(data: MindMapData): void {
    try {
      this.service.importData(data);
      this.render(); // Full render needed after model change
      this.restoreSelection(data);
      this.eventBus.emit('model:load', data);
      if (data.theme) {
        this.setTheme(data.theme, { saveState: false, emitChange: false });
      }
      this.eventBus.emit('model:change', undefined);
    } catch (e) {
      console.error('Failed to load data', e);
    }
  }

  // Batching
  batch(callback: () => void): void {
    this.isBatching = true;
    try {
      callback();
    } finally {
      this.isBatching = false;
      this.render();
    }
  }

  // Accessors
  getSelectedNodeId(): string | null {
    return this.selectedNodeId;
  }

  getSelectedNodeIds(): string[] {
    return Array.from(this.selectedNodeIds);
  }

  private getIdsToActOn(targetId: string): string[] {
    if (this.selectedNodeIds.has(targetId)) {
      return Array.from(this.selectedNodeIds);
    }
    return [targetId];
  }

  private saveState(): void {
    if (this.isBatching) return;
    const data = this.getData();
    this.historyService.saveState(data);
  }

  // Core API Delegate
  addNode(
    parentId: string,
    topic?: string,
    layoutSide?: 'left' | 'right',
    options: { emitChange?: boolean } = { emitChange: true },
  ): Node | null {
    if (options.emitChange) this.saveState();
    this.eventBus.emit('command', { name: 'addNode', args: { parentId, topic, layoutSide } });
    const node = this.service.addNode(parentId, topic, layoutSide);
    if (node) {
      this.render();
      this.eventBus.emit('node:add', { id: node.id, topic: node.topic });
      if (options.emitChange) {
        this.eventBus.emit('model:change', undefined);
      }
    }
    return node;
  }

  addSibling(
    referenceId: string,
    position: 'before' | 'after' = 'after',
    topic: string = 'New topic',
    options: { emitChange?: boolean } = { emitChange: true },
  ): Node | null {
    if (options.emitChange) this.saveState();
    this.eventBus.emit('command', { name: 'addSibling', args: { referenceId, position, topic } });
    const node = this.mindMap.findNode(referenceId);
    if (!node || !node.parentId) return null;

    const parent = this.mindMap.findNode(node.parentId);
    if (parent && parent.isRoot && this.layoutMode === 'Both') {
      this.navigationService.ensureExplicitLayoutSides(parent);
    }

    const newNode = this.service.addSibling(referenceId, position, topic);
    if (newNode) {
      if (parent && parent.isRoot && this.layoutMode === 'Both') {
        const currentSide =
          node.presentation.layoutSide ||
          (parent.children.indexOf(node) % 2 === 0 ? 'right' : 'left');
        newNode.presentation.layoutSide = currentSide;
      }
      this.render();
      this.eventBus.emit('node:add', { id: newNode.id, topic: newNode.topic });
      if (options.emitChange) {
        this.eventBus.emit('model:change', undefined);
      }
    }
    return newNode;
  }

  insertParent(
    targetId: string,
    topic: string = 'New topic',
    options: { emitChange?: boolean } = { emitChange: true },
  ): Node | null {
    if (options.emitChange) this.saveState();
    this.eventBus.emit('command', { name: 'insertParent', args: { targetId, topic } });
    const newNode = this.service.insertParent(targetId, topic);
    if (newNode) {
      this.render();
      this.eventBus.emit('node:add', { id: newNode.id, topic: newNode.topic });
      if (options.emitChange) {
        this.eventBus.emit('model:change', undefined);
      }
    }
    return newNode;
  }

  deleteNode(nodeId: string): void {
    this.saveState();
    this.eventBus.emit('command', { name: 'deleteNode', args: { nodeId } });

    const ids = this.getIdsToActOn(nodeId);
    if (ids.length > 1) {
      if (this.service.removeNodes(ids)) {
        this.render();
        ids.forEach((id) => this.eventBus.emit('node:remove', id));
        this.eventBus.emit('model:change', undefined);
      }
    } else {
      const result = this.service.removeNode(nodeId);
      if (result) {
        this.render();
        this.eventBus.emit('node:remove', nodeId);
        this.eventBus.emit('model:change', undefined);
      }
    }
  }

  updateNode(
    nodeId: string,
    updates: { topic?: string; style?: Partial<NodeStyle>; icon?: string },
  ): void {
    this.saveState();
    this.eventBus.emit('command', { name: 'updateNode', args: { nodeId, updates } });
    if (this.interactionHandler && this.interactionHandler.isReadOnly) return;

    let changed = false;
    const ids = this.getIdsToActOn(nodeId);

    if (updates.topic !== undefined) {
      // Topic update only for the primary node
      if (this.service.updateNodeTopic(nodeId, updates.topic)) changed = true;
    }

    if (updates.style !== undefined) {
      if (this.service.updateNodesStyle(ids, updates.style)) changed = true;
    }

    if (updates.icon !== undefined) {
      // Loop for icon updates as service might not have bulk icon update yet
      // Or just apply to primary? Usually icons are applied one by one or bulk.
      // Let's loop.
      let iconChanged = false;
      ids.forEach((id) => {
        if (this.service.updateNodeIcon(id, updates.icon!)) iconChanged = true;
      });
      if (iconChanged) changed = true;
    }

    if (changed) {
      this.render();
      if (updates.topic !== undefined) {
        this.eventBus.emit('node:update', { id: nodeId, topic: updates.topic });
      }
      this.eventBus.emit('model:change', undefined);
      if (this.pendingNodeCreation) {
        this.pendingNodeCreation = false;
      }
    }
  }

  // Interaction Handlers
  updateNodeWidth(nodeId: string, increment: number): void {
    this.saveState();
    this.eventBus.emit('command', { name: 'updateNodeWidth', args: { nodeId, increment } });
    if (this.interactionHandler && this.interactionHandler.isReadOnly) return;

    const node = this.mindMap.findNode(nodeId);
    if (!node) return;

    // Determine current effective width
    let currentWidth = node.presentation.customWidth;

    if (currentWidth === undefined) {
      // Use renderer's measurement logic to get the current natural width
      // This is more robust than querying the DOM directly
      const measured = this.renderer.measureNode(node, this.mindMap);
      currentWidth = measured.width;
    }

    let newWidth = currentWidth + increment;

    // Minimum width constraint (e.g., 50px)
    if (newWidth < 50) newWidth = 50;

    // Update via service
    if (this.service.updateNodeCustomWidth(nodeId, newWidth)) {
      this.render();
      this.eventBus.emit('model:change', undefined);
    }
  }

  addChildNode(parentId: string): void {
    const parent = this.mindMap.findNode(parentId);
    if (parent && parent.isRoot && this.layoutMode === 'Both') {
      this.navigationService.ensureExplicitLayoutSides(parent);
    }

    let side: 'left' | 'right' | undefined;
    if (this.layoutMode === 'Both') {
      if (parent && parent.isRoot) {
        let leftCount = 0;
        let rightCount = 0;
        parent.children.forEach((child: Node, index: number) => {
          const dir = child.presentation.layoutSide || (index % 2 === 0 ? 'right' : 'left');
          if (dir === 'left') leftCount++;
          else rightCount++;
        });
        side = leftCount < rightCount ? 'left' : 'right';
      }
    }

    this.pendingNodeCreation = true;
    const node = this.addNode(parentId, 'New topic', side, { emitChange: false });
    if (node) {
      this.selectNode(node.id);
      this.ensureNodeVisible(node.id, false, true);
      this.interactionHandler.editNode(node.id);
    }
  }

  addSiblingNode(nodeId: string, position: 'before' | 'after' = 'after'): void {
    this.pendingNodeCreation = true;
    const newNode = this.addSibling(nodeId, position, 'New topic', { emitChange: false });
    if (newNode) {
      this.selectNode(newNode.id);
      this.ensureNodeVisible(newNode.id, false, true);
      this.interactionHandler.editNode(newNode.id);
    }
  }

  insertParentNode(nodeId: string): void {
    this.pendingNodeCreation = true;
    const newNode = this.insertParent(nodeId, 'New topic', { emitChange: false });
    if (newNode) {
      this.selectNode(newNode.id);
      this.ensureNodeVisible(newNode.id, false, true);
      this.interactionHandler.editNode(newNode.id);
    }
  }

  removeNode(nodeId: string): void {
    const ids = this.getIdsToActOn(nodeId);
    const targetSelectId = this.findTargetIdAfterRemoval(nodeId, ids);

    this.deleteNode(nodeId);

    this.selectNode(targetSelectId);
  }

  selectNode(nodeId: string | null): void {
    // Reset anchor when normal selection occurs
    this.anchorNodeId = null;

    if (
      this.selectedNodeId === nodeId &&
      this.selectedNodeIds.size === 1 &&
      nodeId &&
      this.selectedNodeIds.has(nodeId)
    )
      return;
    if (nodeId === null && this.selectedNodeId === null && this.selectedNodeIds.size === 0) return;

    this.selectedNodeId = nodeId;
    this.selectedNodeIds.clear();
    if (nodeId) {
      this.selectedNodeIds.add(nodeId);
    }

    this.updateSelectionState();
  }

  selectNodes(nodeIds: string[]): void {
    this.selectedNodeIds = new Set(nodeIds);
    // Set primary node to the last selected one
    this.selectedNodeId = nodeIds.length > 0 ? nodeIds[nodeIds.length - 1] : null;

    this.updateSelectionState();
  }

  private updateSelectionState(): void {
    const nodeId = this.selectedNodeId;

    if (this.interactionHandler) {
      this.interactionHandler.updateSelection(nodeId);
    }

    if (nodeId) {
      const node = this.mindMap.findNode(nodeId);
      if (node) {
        if (!node.image && this.interactionHandler && !this.interactionHandler.isReadOnly) {
          this.styleEditor.show(nodeId, node.style);
        } else {
          this.styleEditor.hide();
        }
      }
    } else {
      this.styleEditor.hide();
    }

    this.renderSelection();
    this.eventBus.emit('node:select', nodeId);
    this.eventBus.emit('selection:change', Array.from(this.selectedNodeIds));
  }

  private restoreSelection(data: MindMapData): void {
    if (data.selectedIds && data.selectedIds.length > 0) {
      this.selectNodes(data.selectedIds);
    } else if (data.selectedId) {
      this.selectNode(data.selectedId);
    } else {
      this.selectNode(null);
    }
  }

  private findTargetIdAfterRemoval(nodeId: string, removedIds: string[]): string {
    const node = this.mindMap.findNode(nodeId);
    if (node) {
      let current: Node | null = node;
      while (current && current.parentId) {
        if (!removedIds.includes(current.parentId)) {
          return current.parentId;
        }
        current = this.mindMap.findNode(current.parentId);
      }
    }
    return this.mindMap.root.id;
  }

  moveNode(nodeId: string, targetId: string, position: 'top' | 'bottom' | 'left' | 'right'): void {
    this.saveState();
    this.eventBus.emit('command', { name: 'moveNode', args: { nodeId, targetId, position } });
    const target = this.mindMap.findNode(targetId);
    if (!target) return;

    if (position === 'top') {
      if (target.isRoot) return;
      this.service.reorderNode(nodeId, targetId, 'before');
    } else if (position === 'bottom') {
      if (target.isRoot) return;
      this.service.reorderNode(nodeId, targetId, 'after');
    } else {
      if (target.isRoot) {
        const side = position === 'left' ? 'left' : 'right';
        this.service.moveNode(nodeId, targetId, side);
      } else {
        const layoutDir = this.navigationService.getNodeDirection(target);
        const action = (layoutDir === 'right' ? position === 'right' : position === 'left')
          ? 'addChild'
          : 'insertParent';

        if (action === 'addChild') {
          this.service.moveNode(nodeId, targetId);
        } else {
          this.service.insertNodeAsParent(nodeId, targetId);
        }
      }
    }

    this.render();
    this.eventBus.emit('node:move', { nodeId, newParentId: targetId, position });
    this.eventBus.emit('model:change', undefined);
  }

  updateNodeTopic(nodeId: string, topic: string): void {
    this.updateNode(nodeId, { topic });
    setTimeout(() => this.ensureNodeVisible(nodeId), 0);
  }

  render(): void {
    if (this.isBatching) return;
    this.renderer.render(this.mindMap, this.selectedNodeIds, this.layoutMode);
    this.viewportService.applyTransform();
  }

  /**
   * Fast path: update selection styles without full DOM rebuild.
   */
  private renderSelection(): void {
    if (this.isBatching) return;
    this.renderer.updateSelection(this.selectedNodeIds);
    this.viewportService.applyTransform();
  }

  setLayoutMode(mode: LayoutMode): void {
    this.eventBus.emit('command', { name: 'setLayoutMode', args: { mode } });
    this.layoutMode = mode;
    this.navigationService.setLayoutMode(mode);
    if (this.layoutSwitcher) this.layoutSwitcher.setMode(mode);

    const clientWidth = this.renderer.container.clientWidth;
    if (mode === 'Right') {
      this.viewportService.setInitialPan(clientWidth * 0.2, 0);
    } else if (mode === 'Left') {
      this.viewportService.setInitialPan(clientWidth * 0.8, 0);
    } else {
      this.viewportService.setInitialPan(clientWidth * 0.5, 0);
    }

    this.render();
  }

  getLayoutMode(): LayoutMode {
    return this.layoutMode;
  }

  setMaxNodeWidth(width: number): void {
    this.maxWidth = width;
    this.renderer.maxWidth = width;
    if (this.interactionHandler) this.interactionHandler.maxWidth = width;
    this.render();
  }

  getMaxNodeWidth(): number {
    return this.maxWidth;
  }

  updateGlobalStyles(styles: MindMapStyles): void {
    this.eventBus.emit('command', { name: 'updateGlobalStyles', args: { styles } });
    if (styles.rootNode)
      this.savedCustomStyles.rootNode = { ...this.savedCustomStyles.rootNode, ...styles.rootNode };
    if (styles.childNode)
      this.savedCustomStyles.childNode = {
        ...this.savedCustomStyles.childNode,
        ...styles.childNode,
      };
    if (styles.connection)
      this.savedCustomStyles.connection = {
        ...this.savedCustomStyles.connection,
        ...styles.connection,
      };
    if (styles.canvas)
      this.savedCustomStyles.canvas = { ...this.savedCustomStyles.canvas, ...styles.canvas };

    if (this.mindMap.theme === 'custom') {
      const registry = ThemeRegistry.getInstance();
      registry.setCustomTheme(this.savedCustomStyles);
      registry.applyTheme(this.renderer.container, 'custom');
    }
  }

  setTheme(
    theme: Theme,
    options: { saveState?: boolean; emitChange?: boolean } = { saveState: true, emitChange: true },
  ): void {
    if (options.saveState !== false) this.saveState();
    this.eventBus.emit('command', { name: 'setTheme', args: { theme } });
    this.service.setTheme(theme);
    if (this.layoutSwitcher) this.layoutSwitcher.setTheme(theme);

    if (theme === 'custom') {
      // Ensure custom theme is updated in registry before applying
      ThemeRegistry.getInstance().setCustomTheme(this.savedCustomStyles);
    }

    ThemeRegistry.getInstance().applyTheme(this.renderer.container, theme);

    this.render();
    this.eventBus.emit('model:change', undefined);
  }

  resetZoom(): void {
    this.viewportService.resetZoom();
    this.render();
  }

  panBoard(dx: number, dy: number): void {
    this.viewportService.pan(dx, dy);
  }

  zoomBoard(delta: number, clientX: number, clientY: number): void {
    this.viewportService.zoom(delta, clientX, clientY);
  }

  setReadOnly(readOnly: boolean): void {
    if (this.interactionHandler) {
      this.interactionHandler.setReadOnly(readOnly);
    }
    if (readOnly) {
      this.styleEditor.hide();
    }
  }

  undo(): void {
    const currentState = this.getData();
    const prevState = this.historyService.undo(currentState);
    if (prevState) {
      this.eventBus.emit('command', { name: 'undo' });
      this.loadData(prevState);
      this.render(); // Full render needed after model change
      this.eventBus.emit('model:change', undefined);
    }
  }

  redo(): void {
    const currentState = this.getData();
    const nextState = this.historyService.redo(currentState);
    if (nextState) {
      this.eventBus.emit('command', { name: 'redo' });
      this.loadData(nextState);
      this.render(); // Full render needed after model change
      this.eventBus.emit('model:change', undefined);
    }
  }

  toggleFold(nodeId: string): void {
    this.saveState();
    if (this.service.toggleNodeFold(nodeId)) {
      this.eventBus.emit('command', { name: 'toggleFold', args: { nodeId } });
      this.render();
      this.eventBus.emit('model:change', undefined);
    }
  }

  navigateNode(
    nodeId: string | null,
    direction: Direction,
    extendSelection: boolean = false,
  ): void {
    if (!nodeId) {
      // If no node is selected, select root
      this.selectNode(this.mindMap.root.id);
      return;
    }

    const node = this.mindMap.findNode(nodeId);
    if (!node) return;

    const targetId = this.navigationService.navigate(nodeId, direction);

    if (targetId) {
      if (extendSelection) {
        // Range Selection Logic
        this.selectRange(nodeId, targetId);
      } else {
        this.selectNode(targetId);
      }
    }

    if (this.selectedNodeId && this.selectedNodeId !== nodeId) {
      setTimeout(() => this.ensureNodeVisible(this.selectedNodeId!, true), 0);
    }
  }

  public selectRangeTo(targetId: string): void {
    if (this.selectedNodeId) {
      this.selectRange(this.selectedNodeId, targetId);
    } else {
      this.selectNode(targetId);
    }
  }

  private selectRange(currentId: string, targetId: string): void {
    // If no anchor, the current node (before move) is the anchor
    if (!this.anchorNodeId) {
      this.anchorNodeId = currentId;
    }

    const anchor = this.mindMap.findNode(this.anchorNodeId);
    const target = this.mindMap.findNode(targetId);

    if (!anchor || !target) return;

    // Check if they are siblings
    if (anchor.parentId && anchor.parentId === target.parentId) {
      // Siblings scope
      const parent = this.mindMap.findNode(anchor.parentId);
      if (parent) {
        const idx1 = parent.children.findIndex((c) => c.id === anchor.id);
        const idx2 = parent.children.findIndex((c) => c.id === target.id);

        if (idx1 !== -1 && idx2 !== -1) {
          const start = Math.min(idx1, idx2);
          const end = Math.max(idx1, idx2);

          const ids = parent.children.slice(start, end + 1).map((c) => c.id);

          // We want to KEEP the anchor as anchorNodeId, and Update selectedNodeId to targetId (focus)
          // selectNodes updates selectedNodeId to the last one in the list.
          // But we want focus on 'targetId'.
          // So we should order ids such that targetId is last?
          // selectedNodeIds is a Set, order matters for Array.from?
          // Our selectNodes implementation: "this.selectedNodeId = nodeIds.length > 0 ? nodeIds[nodeIds.length - 1] : null;"

          // Ideally we pass ids and explicitly set focus.
          // But selectNodes derives focus.
          // Let's modify selectNodes or just ensure 'targetId' is passed last in array?
          // But 'ids' is slice from children array.

          // Let's modify selectNodes to optionally accept a focusId?
          // Or just update selectedNodeId AFTER selectNodes?

          this.selectNodes(ids);

          // Force focus to targetId
          this.selectedNodeId = targetId;
          this.updateSelectionState(); // Re-emit with correct focus

          return;
        }
      }
    }

    // Fallback: If not siblings (e.g. parent-child), add target to selection
    // Keep anchorNodeId as is (original start of selection)
    const currentSelection = new Set(this.selectedNodeIds);
    currentSelection.add(targetId);
    this.selectNodes(Array.from(currentSelection));

    // Force focus to targetId
    this.selectedNodeId = targetId;
    this.updateSelectionState();
  }

  copyNode(nodeId: string): void {
    const ids = this.getIdsToActOn(nodeId);
    if (ids.length > 1) {
      this.clipboardService.copyNodes(ids);
    } else {
      this.clipboardService.copyNodes([nodeId]);
    }
  }

  pasteNode(parentId: string): void {
    this.saveState();
    this.eventBus.emit('command', { name: 'pasteNode', args: { parentId } });
    const newNodes = this.clipboardService.createPastedNodes(parentId);
    const newNode = newNodes.length > 0 ? newNodes[0] : null;
    if (newNodes.length > 0) this.service.addExistingNodes(parentId, newNodes);
    if (newNode) {
      this.render();
      this.selectNode(newNode.id);
      this.eventBus.emit('node:add', { id: newNode.id, topic: newNode.topic });
      this.eventBus.emit('model:change', undefined);
      setTimeout(() => this.ensureNodeVisible(newNode.id, true), 0);
    }
  }

  cutNode(nodeId: string): void {
    this.saveState();
    this.eventBus.emit('command', { name: 'cutNode', args: { nodeId } });
    const ids = this.getIdsToActOn(nodeId);

    // For selection after cut, we need to find the nearest ancestor that is NOT being cut.
    const targetSelectId = this.findTargetIdAfterRemoval(nodeId, ids);

    if (ids.length > 1) {
      this.clipboardService.copyNodes(ids);
      this.service.removeNodes(ids);
    } else {
      this.clipboardService.copyNodes([nodeId]);
      this.service.removeNode(nodeId);
    }

    this.selectNode(targetSelectId);
    this.render();
    ids.forEach((id) => this.eventBus.emit('node:remove', id));
    this.eventBus.emit('model:change', undefined);
  }

  pasteImage(parentId: string, imageData: string, width?: number, height?: number): void {
    this.saveState();
    this.eventBus.emit('command', { name: 'pasteImage', args: { parentId, width, height } });
    const newNode = this.service.addImageNode(parentId, imageData, width, height);
    if (newNode) {
      this.render();
      this.selectNode(newNode.id);
      this.eventBus.emit('node:add', { id: newNode.id, topic: '' });
      this.eventBus.emit('model:change', undefined);
      setTimeout(() => this.ensureNodeVisible(newNode.id, true), 0);
    }
  }

  onEditEnd(): void {
    if (this.pendingNodeCreation) {
      this.pendingNodeCreation = false;
      this.eventBus.emit('model:change', undefined);
    }
  }

  onStyleAction(nodeId: string, action: StyleAction): void {
    this.saveState();
    if (this.interactionHandler && this.interactionHandler.isReadOnly) return;
    const node = this.mindMap.findNode(nodeId);
    if (!node) return;

    const currentStyle = node.style || {};
    let newStyle: Partial<NodeStyle> | null = null;

    if (action.type === 'bold') {
      newStyle = { fontWeight: currentStyle.fontWeight === 'bold' ? 'normal' : 'bold' };
    } else if (action.type === 'italic') {
      newStyle = { fontStyle: currentStyle.fontStyle === 'italic' ? 'normal' : 'italic' };
    } else if (action.type === 'color') {
      if (action.index >= 0 && action.index < StyleEditor.PALETTE.length) {
        newStyle = { color: StyleEditor.PALETTE[action.index] };
      }
    } else if (action.type === 'increaseSize' || action.type === 'decreaseSize') {
      const sizes = StyleEditor.FONT_SIZES;
      const currentVal = currentStyle.fontSize || '';
      let currentIndex = sizes.findIndex((s) => s.value === currentVal);
      if (currentIndex === -1) currentIndex = 0;

      const newIndex =
        action.type === 'increaseSize'
          ? Math.min(sizes.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);

      if (newIndex !== currentIndex) newStyle = { fontSize: sizes[newIndex].value };
    }

    if (newStyle) {
      const ids = this.getIdsToActOn(nodeId);
      // Logic: Update all selected nodes with newStyle.
      // Note: newStyle is derived from the *primary* node (nodeId).
      // This is standard behavior (mixed state -> toggle based on focused).

      if (this.service.updateNodesStyle(ids, newStyle)) {
        this.render();
        this.eventBus.emit('model:change', undefined);
        // Show editor for primary node if selected
        if (this.selectedNodeId === nodeId) {
          this.styleEditor.show(nodeId, { ...currentStyle, ...newStyle });
        }
      }
    }
  }

  public toggleCommandPalette(): void {
    if (this.interactionHandler && this.interactionHandler.isReadOnly) return;
    this.commandPalette.toggle();
  }

  public registerCommand(command: CustomCommand): void {
    this.commandPalette.addCustomCommand(command);
  }

  public searchNodes(query: string): Node[] {
    return this.searchService.searchNodes(query);
  }

  private handleSearchInput(query: string): void {
    const results = this.searchService.searchNodes(query);
    this.commandPalette.setResults(results.map((n) => ({ id: n.id, topic: n.topic })));
  }

  private handleSearchResultSelect(nodeId: string): void {
    this.selectNode(nodeId);
    setTimeout(() => this.ensureNodeVisible(nodeId, true, true), 0);
  }

  private handleIconSelect(icon: string): void {
    if (this.selectedNodeId) {
      this.service.updateNodeIcon(this.selectedNodeId, icon);
      this.render();
      this.eventBus.emit('model:change', undefined);
      setTimeout(() => this.ensureNodeVisible(this.selectedNodeId!, true, true), 0);
    }
  }

  private handleCommandSelect(command: string): void {
    if (command === 'import-xmind') {
      void this.importXMind();
    } else if (command === 'export-png') {
      void this.exportPng();
    } else if (command === 'export-svg') {
      void this.exportSvg();
    } else if (command === 'export-markdown') {
      void this.exportMarkdown();
    }
  }

  public async exportPng(): Promise<void> {
    this.eventBus.emit('command', { name: 'exportPng' });
    const exporter = new ImageExporter();
    await exporter.exportToPng(this.renderer.container, this.fileHandler);
  }

  public async exportSvg(): Promise<void> {
    this.eventBus.emit('command', { name: 'exportSvg' });
    const exporter = new ImageExporter();
    await exporter.exportToSvg(this.renderer.container, this.fileHandler);
  }

  public async exportMarkdown(): Promise<void> {
    this.eventBus.emit('command', { name: 'exportMarkdown' });
    const exporter = new MarkdownExporter();
    await exporter.export(this.mindMap, this.fileHandler);
  }

  public async importXMind(): Promise<void> {
    this.eventBus.emit('command', { name: 'importXMind' });
    // Check if root has children to confirm replacement
    if (this.mindMap.root.children.length > 0) {
      if (!window.confirm('Current mind map will be replaced. Continue?')) {
        return;
      }
    }

    if (this.fileHandler) {
      const content = await this.fileHandler.onImportFile('xmind');
      if (content) {
        try {
          const importer = new XMindImporter();
          let file: File;
          if (content instanceof ArrayBuffer) {
            file = new File([content], 'imported.xmind');
          } else if (typeof content === 'string') {
            file = new File([content], 'imported.xmind');
          } else {
            return;
          }

          const data = await importer.extractMindMapData(file);
          this.loadData(data);
        } catch (err) {
          console.error(err);
          alert('Failed to import XMind file.');
        }
      }
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xmind';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        try {
          const importer = new XMindImporter();
          const data = await importer.extractMindMapData(file);
          this.loadData(data);
        } catch (err) {
          console.error(err);
          alert('Failed to import XMind file.');
        }
      }
      document.body.removeChild(input);
    };

    input.click();
  }

  private ensureNodeVisible(
    nodeId: string,
    centerIfOffscreen: boolean = false,
    immediate: boolean = false,
  ): void {
    this.viewportService.ensureNodeVisible(nodeId, centerIfOffscreen, immediate);
  }

  public showHelpModal(): void {
    if (!this.interactionHandler) return;

    // Check if valid environment (browsers)
    if (typeof document === 'undefined') return;

    const helpModal = new HelpModal();
    helpModal.show(this.interactionHandler.getShortcuts(), this.locale, this.layoutSwitcher);
  }
}
