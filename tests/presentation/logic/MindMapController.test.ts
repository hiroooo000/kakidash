/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MindMapController } from '../../../src/presentation/logic/MindMapController';
import { MindMap } from '../../../src/features/core/domain/MindMap';
import { Node } from '../../../src/features/core/domain/Node';
import { MindMapService } from '../../../src/features/core/application/MindMapService';
import { Renderer } from '../../../src/presentation/components/Renderer';
import { StyleEditor } from '../../../src/features/theme/components/StyleEditor';
import { IMindMapEventBus } from '../../../src/presentation/logic/MindMapController';
import { HistoryService } from '../../../src/features/core/application/HistoryService';
import { ClipboardService } from '../../../src/features/core/application/ClipboardService';
import { SearchService } from '../../../src/features/core/application/SearchService';
import { ViewportService } from '../../../src/presentation/logic/ViewportService';
import { NavigationService } from '../../../src/presentation/logic/NavigationService';
import { ThemeService } from '../../../src/presentation/logic/ThemeService';
import { CommandBus } from '../../../src/presentation/commands/CommandBus';
// Remove vi.mock and use spyOn instead
// vi.mock('../../../src/features/io/XMindImporter');

describe('MindMapController', () => {
  let controller: MindMapController;
  let mindMap: MindMap;
  let service: MindMapService;
  let renderer: Renderer;
  let styleEditor: StyleEditor;
  let eventBus: IMindMapEventBus;
  let historyService: HistoryService;
  let clipboardService: ClipboardService;
  let searchService: SearchService;
  let mockEmit: ReturnType<typeof vi.fn>;
  let mockImportData: ReturnType<typeof vi.fn>;
  let themeServiceMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    // Setup Mocks
    const rootNode = new Node('root', 'Root');
    mindMap = new MindMap(rootNode);

    // Mock window.alert and window.confirm
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );

    historyService = {
      saveState: vi.fn(),
      undo: vi.fn().mockReturnValue({ nodeData: { id: 'root', topic: 'Root' } }),
      redo: vi.fn().mockReturnValue({ nodeData: { id: 'root', topic: 'Root' } }),
    } as any;
    clipboardService = {
      copyNodes: vi.fn(),
      createPastedNodes: vi.fn().mockReturnValue([new Node('pasted', 'Pasted')]),
    } as any;
    searchService = {
      searchNodes: vi.fn().mockReturnValue([]),
    } as any;

    mockImportData = vi.fn();
    service = {
      importData: mockImportData,
      exportData: vi.fn().mockImplementation(() => ({
        nodeData: { id: 'root', topic: 'Root' },
        theme: {
          name: 'default',
          background: '#ffffff',
          node: { color: '#000000', backgroundColor: '#ffffff', border: '#000000' },
          connection: { color: '#000000', width: 2 },
        },
      })),
      addNode: vi.fn().mockReturnValue(new Node('new-id', 'Topic')),
      addSibling: vi.fn().mockReturnValue(new Node('sib-id', 'Topic')),
      insertParent: vi.fn().mockReturnValue(new Node('par-id', 'Topic')),
      removeNode: vi.fn().mockReturnValue(true),
      removeNodes: vi.fn().mockReturnValue(true),
      updateNodeTopic: vi.fn().mockReturnValue(true),
      updateNodesStyle: vi.fn().mockReturnValue(true),
      updateNodeIcon: vi.fn().mockReturnValue(true),
      updateNodeCustomWidth: vi.fn().mockReturnValue(true),
      reorderNode: vi.fn(),
      moveNode: vi.fn(),
      insertNodeAsParent: vi.fn(),
      setTheme: vi.fn(),
      toggleNodeFold: vi.fn().mockReturnValue(true),
      addImageNode: vi.fn().mockReturnValue(new Node('img-id', 'Topic')),
      addExistingNodes: vi.fn().mockReturnValue(true),
    } as unknown as MindMapService;

    const container = document.createElement('div');
    renderer = {
      container,
      renderFromLayout: vi.fn(),
      updateTransform: vi.fn(),
      measureNode: vi.fn().mockReturnValue({ width: 100, height: 50 }),
      updateSelection: vi.fn(),
    } as unknown as Renderer;

    styleEditor = {
      show: vi.fn(),
      hide: vi.fn(),
    } as unknown as StyleEditor;

    mockEmit = vi.fn();
    eventBus = {
      emit: mockEmit as any,
      on: vi.fn(),
      off: vi.fn(),
    };

    const viewportService = {
      pan: vi.fn(),
      zoom: vi.fn(),
      resetZoom: vi.fn(),
      setInitialPan: vi.fn(),
      applyTransform: vi.fn(),
      ensureNodeVisible: vi.fn(),
      startAnimationLoop: vi.fn(),
      destroy: vi.fn(),
      getScale: vi.fn().mockReturnValue(1),
      getPan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    } as unknown as ViewportService;

    const navigationService = {
      navigate: vi.fn(),
      getNodeDirection: vi.fn().mockReturnValue('right'),
      ensureExplicitLayoutSides: vi.fn(),
      setLayoutMode: vi.fn(),
      getLayoutMode: vi.fn().mockReturnValue('Right'),
    } as unknown as NavigationService;

    themeServiceMock = {
      applyInitialTheme: vi.fn(),
      setTheme: vi.fn(),
      updateGlobalStyles: vi.fn(),
      setLayoutSwitcher: vi.fn(),
    };

    controller = new MindMapController({
      mindMap,
      service,
      renderer,
      styleEditor,
      eventBus,
      historyService,
      clipboardService,
      searchService,
      viewportService,
      navigationService,
      fileIOService: {} as any,
      themeService: themeServiceMock as unknown as ThemeService,
      commandBus: new CommandBus(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should emit command events for various operations', () => {
    // Arrange & Act
    controller.addNode('root', 'Child');
    expect(mockEmit).toHaveBeenCalledWith('command', expect.objectContaining({ name: 'addNode' }));

    controller.undo();
    expect(mockEmit).toHaveBeenCalledWith('command', expect.objectContaining({ name: 'undo' }));

    controller.redo();
    expect(mockEmit).toHaveBeenCalledWith('command', expect.objectContaining({ name: 'redo' }));

    controller.setTheme('simple');

    expect(themeServiceMock.setTheme).toHaveBeenCalledWith('simple', expect.anything());

    controller.setLayoutMode('Left');
    expect(mockEmit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'setLayoutMode' }),
    );

    controller.moveNode('node-id', 'target-id', 'right');
    expect(mockEmit).toHaveBeenCalledWith('command', expect.objectContaining({ name: 'moveNode' }));
  });

  it('should register custom commands on the command palette', () => {
    // Arrange
    const handler = vi.fn();
    const customCmd = {
      id: 'custom-1',
      topic: 'Custom Action',
      execute: handler,
    };
    const addCustomCommandSpy = vi.spyOn(controller['commandPalette'], 'addCustomCommand');

    // Act
    controller.registerCommand(customCmd);

    // Assert
    expect(addCustomCommandSpy).toHaveBeenCalledWith(customCmd);
  });
});
