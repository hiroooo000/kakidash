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
import { ShortcutAction, KeyBinding } from '../../features/core/domain/ShortcutConfig';
import { MindMapStyles } from '../../features/theme/domain/MindMapStyles';
import { StyleAction } from '../../features/theme/domain/StyleAction';
import { CommandPalette } from '../components/CommandPalette';
import { ThemeRegistry } from '../../features/theme/registry/ThemeRegistry';
import { XMindImporter } from '../../features/export_import/XMindImporter';
import { ImageExporter } from '../../features/export_import/ImageExporter';
import { MarkdownExporter } from '../../features/export_import/MarkdownExporter';
import { FileHandler } from '../../shared/kernel/FileHandler';

export interface IMindMapEventBus {
  emit<K extends keyof KakidashEventMap>(event: K, payload: KakidashEventMap[K]): void;
}

export class MindMapController {
  private mindMap: MindMap;
  private service: MindMapService;
  private renderer: Renderer;
  private eventBus: IMindMapEventBus;
  private styleEditor: StyleEditor;
  private commandPalette: CommandPalette;
  private interactionHandler!: InteractionHandler;
  private layoutSwitcher!: LayoutSwitcher;
  private fileHandler?: FileHandler;

  private selectedNodeId: string | null = null;
  private layoutMode: LayoutMode = 'Right';

  private panX: number = 0;
  private panY: number = 0;
  private targetPanX: number = 0;
  private targetPanY: number = 0;
  private scale: number = 1;
  private isBatching: boolean = false;
  private animationFrameId: number | null = null;
  private maxWidth: number = -1;

  private pendingNodeCreation: boolean = false;

  private savedCustomStyles: MindMapStyles = {
    rootNode: { border: '2px solid #aeb6bf', background: '#ebf5fb', color: '#2e4053' },
    childNode: { border: '1px solid #d5d8dc', background: '#fdfefe', color: '#2c3e50' },
    connection: { color: '#abb2b9' },
  };

  constructor(
    mindMap: MindMap,
    service: MindMapService,
    renderer: Renderer,
    styleEditor: StyleEditor,
    eventBus: IMindMapEventBus,
    fileHandler?: FileHandler,
  ) {
    this.mindMap = mindMap;
    this.service = service;
    this.renderer = renderer;
    this.styleEditor = styleEditor;
    this.eventBus = eventBus;
    this.fileHandler = fileHandler;
    this.commandPalette = new CommandPalette(this.renderer.container, {
      onInput: (query) => this.handleSearchInput(query),
      onSelect: (nodeId) => this.handleSearchResultSelect(nodeId),
      onIconSelect: (icon) => this.handleIconSelect(icon),
      onCommandSelect: (command) => this.handleCommandSelect(command),
      onClose: () => {
        if (this.interactionHandler) this.interactionHandler.container.focus();
      },
    });
  }

  public setInteractionHandler(handler: InteractionHandler) {
    this.interactionHandler = handler;
  }

  public setLayoutSwitcher(switcher: LayoutSwitcher) {
    this.layoutSwitcher = switcher;
  }

  public init(containerWidth: number) {
    this.panX = containerWidth * 0.2; // Default Right mode
    this.targetPanX = this.panX;

    // Apply initial theme
    const theme = this.mindMap.theme;
    if (theme === 'custom') {
      const registry = ThemeRegistry.getInstance();
      registry.setCustomTheme(this.savedCustomStyles);
      registry.applyTheme(this.renderer.container, 'custom');
    } else {
      ThemeRegistry.getInstance().applyTheme(this.renderer.container, theme);
    }

    this.startAnimationLoop();
    this.render();
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Data Persistence
  getData(): MindMapData {
    const data = this.service.exportData();
    data.selectedId = this.selectedNodeId || undefined;
    return data;
  }

  loadData(data: MindMapData): void {
    try {
      this.service.importData(data);
      if (data.selectedId) {
        this.selectNode(data.selectedId);
      } else {
        this.selectNode(null);
      }
      this.render();
      this.eventBus.emit('model:load', data);
      if (data.theme) {
        this.setTheme(data.theme);
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

  // Core API Delegate
  addNode(
    parentId: string,
    topic?: string,
    layoutSide?: 'left' | 'right',
    options: { emitChange?: boolean } = { emitChange: true },
  ): Node | null {
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
    this.eventBus.emit('command', { name: 'addSibling', args: { referenceId, position, topic } });
    const node = this.mindMap.findNode(referenceId);
    if (!node || !node.parentId) return null;

    const parent = this.mindMap.findNode(node.parentId);
    if (parent && parent.isRoot && this.layoutMode === 'Both') {
      this.ensureExplicitLayoutSides(parent);
    }

    const newNode = this.service.addSibling(referenceId, position, topic);
    if (newNode) {
      if (parent && parent.isRoot && this.layoutMode === 'Both') {
        const currentSide =
          node.layoutSide || (parent.children.indexOf(node) % 2 === 0 ? 'right' : 'left');
        newNode.layoutSide = currentSide;
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
    this.eventBus.emit('command', { name: 'deleteNode', args: { nodeId } });
    const result = this.service.removeNode(nodeId);
    if (result) {
      this.render();
      this.eventBus.emit('node:remove', nodeId);
      this.eventBus.emit('model:change', undefined);
    }
  }

  updateNode(
    nodeId: string,
    updates: { topic?: string; style?: Partial<NodeStyle>; icon?: string },
  ): void {
    this.eventBus.emit('command', { name: 'updateNode', args: { nodeId, updates } });
    let changed = false;
    if (this.interactionHandler && this.interactionHandler.isReadOnly) return;

    if (updates.topic !== undefined) {
      if (this.service.updateNodeTopic(nodeId, updates.topic)) changed = true;
    }
    if (updates.style !== undefined) {
      if (this.service.updateNodeStyle(nodeId, updates.style)) changed = true;
    }
    if (updates.icon !== undefined) {
      if (this.service.updateNodeIcon(nodeId, updates.icon)) changed = true;
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
    this.eventBus.emit('command', { name: 'updateNodeWidth', args: { nodeId, increment } });
    if (this.interactionHandler && this.interactionHandler.isReadOnly) return;

    const node = this.mindMap.findNode(nodeId);
    if (!node) return;

    // Determine current effective width
    let currentWidth = node.customWidth;

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
      this.ensureExplicitLayoutSides(parent);
    }

    let side: 'left' | 'right' | undefined;
    if (this.layoutMode === 'Both') {
      if (parent && parent.isRoot) {
        let leftCount = 0;
        let rightCount = 0;
        parent.children.forEach((child: Node, index: number) => {
          const dir = child.layoutSide || (index % 2 === 0 ? 'right' : 'left');
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
    const node = this.mindMap.findNode(nodeId);
    const parentId = node?.parentId || null;
    const isSelected = this.selectedNodeId === nodeId;

    this.deleteNode(nodeId);

    if (isSelected && parentId) {
      this.selectNode(parentId);
    }
  }

  selectNode(nodeId: string | null): void {
    if (this.selectedNodeId === nodeId) return;
    this.selectedNodeId = nodeId;
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

    this.render();
    this.eventBus.emit('node:select', nodeId);
  }

  moveNode(nodeId: string, targetId: string, position: 'top' | 'bottom' | 'left' | 'right'): void {
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
        const layoutDir = this.getNodeDirection(target);
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
    this.renderer.render(this.mindMap, this.selectedNodeId, this.layoutMode);
    this.renderer.updateTransform(this.panX, this.panY, this.scale);
  }

  setLayoutMode(mode: LayoutMode): void {
    this.eventBus.emit('command', { name: 'setLayoutMode', args: { mode } });
    this.layoutMode = mode;
    if (this.layoutSwitcher) this.layoutSwitcher.setMode(mode);

    const clientWidth = this.renderer.container.clientWidth;
    if (mode === 'Right') {
      this.panX = clientWidth * 0.2;
    } else if (mode === 'Left') {
      this.panX = clientWidth * 0.8;
    } else {
      this.panX = clientWidth * 0.5;
    }

    this.panY = 0;
    this.targetPanX = this.panX;
    this.targetPanY = this.panY;

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

  setTheme(theme: Theme): void {
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
    const cx = this.renderer.container.clientWidth / 2;
    const cy = this.renderer.container.clientHeight / 2;
    const newScale = 1.0;

    this.panX = cx - (cx - this.panX) * (newScale / this.scale);
    this.panY = cy - (cy - this.panY) * (newScale / this.scale);

    this.scale = newScale;
    this.targetPanX = this.panX;
    this.targetPanY = this.panY;
    this.render();
  }

  panBoard(dx: number, dy: number): void {
    this.targetPanX += dx;
    this.targetPanY += dy;
  }

  zoomBoard(delta: number, clientX: number, clientY: number): void {
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

  setReadOnly(readOnly: boolean): void {
    if (this.interactionHandler) {
      this.interactionHandler.setReadOnly(readOnly);
    }
    if (readOnly) {
      this.styleEditor.hide();
    }
  }

  undo(): void {
    if (this.service.undo()) {
      this.eventBus.emit('command', { name: 'undo' });
      this.render();
      this.eventBus.emit('model:change', undefined);
    }
  }

  redo(): void {
    if (this.service.redo()) {
      this.eventBus.emit('command', { name: 'redo' });
      this.render();
      this.eventBus.emit('model:change', undefined);
    }
  }

  toggleFold(nodeId: string): void {
    if (this.service.toggleNodeFold(nodeId)) {
      this.eventBus.emit('command', { name: 'toggleFold', args: { nodeId } });
      this.render();
      this.eventBus.emit('model:change', undefined);
    }
  }

  navigateNode(nodeId: string, direction: Direction): void {
    const node = this.mindMap.findNode(nodeId);
    if (!node) return;

    let targetId: string | undefined;

    switch (direction) {
      case 'Left':
        targetId = this.navigateLeft(node);
        break;
      case 'Right':
        targetId = this.navigateRight(node);
        break;
      case 'Up':
        targetId = this.navigateUp(node);
        break;
      case 'Down':
        targetId = this.navigateDown(node);
        break;
    }

    if (targetId) this.selectNode(targetId);

    if (this.selectedNodeId && this.selectedNodeId !== nodeId) {
      setTimeout(() => this.ensureNodeVisible(this.selectedNodeId!, true), 0);
    }
  }

  copyNode(nodeId: string): void {
    this.service.copyNode(nodeId);
  }

  pasteNode(parentId: string): void {
    this.eventBus.emit('command', { name: 'pasteNode', args: { parentId } });
    const newNode = this.service.pasteNode(parentId);
    if (newNode) {
      this.render();
      this.selectNode(newNode.id);
      this.eventBus.emit('node:add', { id: newNode.id, topic: newNode.topic });
      this.eventBus.emit('model:change', undefined);
      setTimeout(() => this.ensureNodeVisible(newNode.id, true), 0);
    }
  }

  cutNode(nodeId: string): void {
    this.eventBus.emit('command', { name: 'cutNode', args: { nodeId } });
    const node = this.mindMap.findNode(nodeId);
    if (node) {
      const parentId = node.parentId;
      this.service.cutNode(nodeId);
      if (parentId) this.selectNode(parentId);
      this.render();
      this.eventBus.emit('node:remove', nodeId);
      this.eventBus.emit('model:change', undefined);
    }
  }

  pasteImage(parentId: string, imageData: string, width?: number, height?: number): void {
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
      if (this.service.updateNodeStyle(nodeId, newStyle)) {
        this.render();
        this.eventBus.emit('model:change', undefined);
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

  public searchNodes(query: string): Node[] {
    return this.service.searchNodes(query);
  }

  private handleSearchInput(query: string): void {
    const results = this.service.searchNodes(query);
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

  private ensureExplicitLayoutSides(parent: Node): void {
    if (!parent.isRoot || this.layoutMode !== 'Both') return;
    parent.children.forEach((child: Node, index: number) => {
      if (!child.layoutSide) {
        child.layoutSide = index % 2 === 0 ? 'right' : 'left';
      }
    });
  }

  private getNodeDirection(node: Node): 'left' | 'right' {
    if (node.isRoot) return 'right';
    if (this.layoutMode === 'Right') return 'right';
    if (this.layoutMode === 'Left') return 'left';

    let current = node;
    while (current.parentId) {
      const parent = this.mindMap.findNode(current.parentId);
      if (!parent) break;
      if (parent.isRoot) {
        if (current.layoutSide) return current.layoutSide;
        const index = parent.children.findIndex((c: Node) => c.id === current.id);
        return index % 2 === 0 ? 'right' : 'left';
      }
      current = parent;
    }
    return 'right';
  }

  private startAnimationLoop(): void {
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

  private ensureNodeVisible(
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
        this.panBoard(dx, dy);
      }
    }
  }

  private navigateLeft(node: Node): string | undefined {
    if (node.isRoot) {
      if (this.layoutMode === 'Left')
        return node.children.length > 0 ? node.children[0].id : undefined;
      if (this.layoutMode === 'Both') {
        const target = node.children.find(
          (c, i) => (c.layoutSide || (i % 2 !== 0 ? 'left' : 'right')) === 'left',
        );
        return target ? target.id : undefined;
      }
    } else if (node.parentId) {
      const dir = this.getNodeDirection(node);
      if (dir === 'right') return node.parentId;
      return node.children.length > 0 ? node.children[0].id : undefined;
    }
  }

  private navigateRight(node: Node): string | undefined {
    if (node.isRoot) {
      if (this.layoutMode === 'Right')
        return node.children.length > 0 ? node.children[0].id : undefined;
      if (this.layoutMode === 'Both') {
        const target = node.children.find(
          (c, i) => (c.layoutSide || (i % 2 === 0 ? 'right' : 'left')) === 'right',
        );
        return target ? target.id : undefined;
      }
    } else if (node.parentId) {
      const dir = this.getNodeDirection(node);
      if (dir === 'right') return node.children.length > 0 ? node.children[0].id : undefined;
      return node.parentId;
    }
  }

  private navigateUp(node: Node): string | undefined {
    if (node.parentId) {
      const parent = this.mindMap.findNode(node.parentId);
      if (parent) {
        const myDir = this.getNodeDirection(node);
        const sameSide = parent.children.filter((c) => this.getNodeDirection(c) === myDir);
        const idx = sameSide.findIndex((c) => c.id === node.id);
        if (idx > 0) return sameSide[idx - 1].id;
      }
    }
  }

  private navigateDown(node: Node): string | undefined {
    if (node.parentId) {
      const parent = this.mindMap.findNode(node.parentId);
      if (parent) {
        const myDir = this.getNodeDirection(node);
        const sameSide = parent.children.filter((c) => this.getNodeDirection(c) === myDir);
        const idx = sameSide.findIndex((c) => c.id === node.id);
        if (idx !== -1 && idx < sameSide.length - 1) return sameSide[idx + 1].id;
      }
    }
  }

  public showShortcutModal(): void {
    if (!this.interactionHandler) return;

    // Check if valid environment (browsers)
    if (typeof document === 'undefined') return;

    const modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100vw';
    modalOverlay.style.height = '100vh';
    modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modalOverlay.style.zIndex = '3000';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.opacity = '0';
    modalOverlay.style.transition = 'opacity 0.2s';

    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    modalContent.style.maxWidth = '600px';
    modalContent.style.width = '90%';
    modalContent.style.maxHeight = '90vh';
    modalContent.style.overflowY = 'auto';
    modalContent.style.position = 'relative';

    const title = document.createElement('h2');
    title.textContent = 'Keyboard Shortcuts';
    title.style.margin = '0 0 15px 0';
    title.style.fontSize = '1.5em';
    title.style.borderBottom = '1px solid #eee';
    title.style.paddingBottom = '10px';
    modalContent.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '15px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#999';
    closeBtn.addEventListener('click', () => {
      closeModal();
    });
    modalContent.appendChild(closeBtn);

    const shortcuts = this.interactionHandler.getShortcuts();
    const sections = [
      {
        title: 'General',
        actions: [
          {
            action: 'openCommandPalette',
            desc: 'Open Command Palette',
            descJa: 'コマンドパレットを開く',
          },
          { action: 'navUp', desc: 'Move Selection Up', descJa: 'ノード間の移動 (上)' },
          { action: 'navDown', desc: 'Move Selection Down', descJa: 'ノード間の移動 (下)' },
          { action: 'navLeft', desc: 'Move Selection Left', descJa: 'ノード間の移動 (左)' },
          { action: 'navRight', desc: 'Move Selection Right', descJa: 'ノード間の移動 (右)' },
          {
            action: 'beginEdit',
            desc: 'Start Editing (Zoom if Image)',
            descJa: 'ノードの編集を開始 (画像の場合はズーム)',
          },
          { action: 'addSibling', desc: 'Add Sibling (Below)', descJa: '兄弟ノードを追加 (下)' },
          {
            action: 'addSiblingBefore',
            desc: 'Add Sibling (Above)',
            descJa: '兄弟ノードを追加 (上)',
          },
          { action: 'addChild', desc: 'Add Child', descJa: '子ノードを追加' },
          { action: 'insertParent', desc: 'Insert Parent', descJa: '親ノードを挿入' },
          { action: 'deleteNode', desc: 'Delete Node', descJa: 'ノードを削除' },
          { action: 'undo', desc: 'Undo', descJa: '元に戻す (Undo)' },
          { action: 'redo', desc: 'Redo', descJa: 'やり直し (Redo)' },
          { action: 'copy', desc: 'Copy', descJa: 'コピー' },
          { action: 'cut', desc: 'Cut', descJa: '切り取り' },
          { action: 'paste', desc: 'Paste', descJa: '貼り付け (画像も可)' },
          { action: 'toggleFold', desc: 'Toggle Fold', descJa: 'ノードの展開/折り畳み' },
          { action: 'zoomIn', desc: 'Canvas Zoom In', descJa: 'キャンバス拡大' },
          { action: 'zoomOut', desc: 'Canvas Zoom Out', descJa: 'キャンバス縮小' },
          { action: 'resetZoom', desc: 'Reset Zoom', descJa: 'ズームリセット' },
          { key: 'Drag (Canvas)', desc: 'Pan Board', descJa: '画面のパン (移動)' },
          { key: 'Wheel', desc: 'Vertical Scroll', descJa: '上下スクロール (パン)' },
          { key: 'Shift + Wheel', desc: 'Horizontal Scroll', descJa: '左右スクロール (パン)' },
          { key: 'Ctrl/Cmd + Wheel', desc: 'Zoom', descJa: 'ズームイン/アウト' },
        ],
      },
      {
        title: 'Editing (Text Input)',
        actions: [
          { key: 'Enter', desc: 'Confirm Edit', descJa: '編集を確定' },
          { key: 'Shift + Enter', desc: 'New Line', descJa: '改行' },
          { key: 'Esc', desc: 'Cancel Edit', descJa: '編集をキャンセル' },
        ],
      },
      {
        title: 'Styling (Selection)',
        actions: [
          { action: 'bold', desc: 'Toggle Bold', descJa: '太字 (Bold) 切り替え' },
          { action: 'italic', desc: 'Toggle Italic', descJa: '斜体 (Italic) 切り替え' },
          { action: 'selectColor1', desc: 'Color 1', descJa: 'ノードの色を変更 (1)' },
          { action: 'selectColor2', desc: 'Color 2', descJa: 'ノードの色を変更 (2)' },
          { action: 'selectColor3', desc: 'Color 3', descJa: 'ノードの色を変更 (3)' },
          { action: 'selectColor4', desc: 'Color 4', descJa: 'ノードの色を変更 (4)' },
          { action: 'selectColor5', desc: 'Color 5', descJa: 'ノードの色を変更 (5)' },
          { action: 'selectColor6', desc: 'Color 6', descJa: 'ノードの色を変更 (6)' },
          { action: 'selectColor7', desc: 'Color 7', descJa: 'ノードの色を変更 (7)' },
          { action: 'increaseFontSize', desc: 'Increase Font Size', descJa: 'フォントサイズ拡大' },
          { action: 'decreaseFontSize', desc: 'Decrease Font Size', descJa: 'フォントサイズ縮小' },
        ],
      },
    ];

    sections.forEach((section) => {
      const rows: { key: string; desc: string }[] = [];
      section.actions.forEach((item) => {
        let keyDisplay = '';
        const actionItem = item as {
          action?: ShortcutAction;
          key?: string;
          desc: string;
          descJa?: string;
        };

        if (actionItem.key) {
          keyDisplay = actionItem.key;
        } else if (actionItem.action && shortcuts[actionItem.action]) {
          const bindings = shortcuts[actionItem.action];
          if (bindings && bindings.length > 0) {
            const displays = bindings.map((b: KeyBinding) => {
              const parts = [];
              if (b.ctrlKey || b.metaKey) parts.push('Ctrl/Cmd');
              if (b.altKey) parts.push('Alt');
              if (b.shiftKey) parts.push('Shift');
              if (b.key === ' ') parts.push('Space');
              else parts.push(b.key);
              return parts.join(' + ');
            });
            keyDisplay = [...new Set(displays)].join(' / ');
          }
        }

        if (keyDisplay) {
          rows.push({ key: keyDisplay, desc: actionItem.descJa || actionItem.desc });
        }
      });

      if (rows.length === 0) return;

      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = section.title;
      sectionTitle.style.marginTop = '20px';
      sectionTitle.style.marginBottom = '10px';
      sectionTitle.style.fontSize = '1.2em';
      sectionTitle.style.color = '#333';
      sectionTitle.style.borderBottom = '1px solid #f0f0f0';
      modalContent.appendChild(sectionTitle);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '0.9em';

      const thead = document.createElement('tr');
      thead.style.borderBottom = '2px solid #ddd';
      const thKey = document.createElement('th');
      thKey.textContent = 'Key';
      thKey.style.textAlign = 'center';
      thKey.style.padding = '8px 0';
      thKey.style.width = '40%';
      thKey.style.color = '#666';
      const thDesc = document.createElement('th');
      thDesc.textContent = 'Description';
      thDesc.style.textAlign = 'center';
      thDesc.style.padding = '8px 0';
      thDesc.style.color = '#666';
      thead.appendChild(thKey);
      thead.appendChild(thDesc);
      table.appendChild(thead);

      rows.forEach((row) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f9f9f9';
        const tdKey = document.createElement('td');
        tdKey.textContent = row.key;
        tdKey.style.padding = '6px 0';
        tdKey.style.fontWeight = 'bold';
        tdKey.style.color = '#555';
        tdKey.style.minWidth = '180px';
        tdKey.style.textAlign = 'center';
        const tdDesc = document.createElement('td');
        tdDesc.textContent = row.desc;
        tdDesc.style.padding = '6px 0';
        tdDesc.style.textAlign = 'left';
        tdDesc.style.color = '#333';
        tr.appendChild(tdKey);
        tr.appendChild(tdDesc);
        table.appendChild(tr);
      });
      modalContent.appendChild(table);
    });

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    requestAnimationFrame(() => {
      modalOverlay.style.opacity = '1';
    });

    const closeModal = () => {
      modalOverlay.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(modalOverlay)) {
          document.body.removeChild(modalOverlay);
        }
      }, 200);
      document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEsc);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }
}
