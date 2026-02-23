/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { MindMapController } from '../../../src/presentation/logic/MindMapController';
import { MindMap } from '../../../src/features/core/domain/MindMap';
import { Node } from '../../../src/features/core/domain/Node';
import { MindMapService } from '../../../src/features/core/application/MindMapService';
import { Renderer } from '../../../src/presentation/components/Renderer';
import { StyleEditor } from '../../../src/features/theme/components/StyleEditor';
import { IMindMapEventBus } from '../../../src/presentation/logic/MindMapController';
import { FileHandler } from '../../../src/shared/kernel/FileHandler';
import { XMindImporter } from '../../../src/features/export_import/XMindImporter';
import { MarkdownExporter } from '../../../src/features/export_import/MarkdownExporter';
import { MindMapData } from '../../../src/features/core/domain/MindMapData';
import { HistoryService } from '../../../src/features/core/application/HistoryService';
import { ClipboardService } from '../../../src/features/core/application/ClipboardService';
import { SearchService } from '../../../src/features/core/application/SearchService';
import { ViewportService } from '../../../src/presentation/logic/ViewportService';
import { NavigationService } from '../../../src/presentation/logic/NavigationService';
import { ImageExporter } from '../../../src/features/export_import/ImageExporter';

// Remove vi.mock and use spyOn instead
// vi.mock('../../../src/features/export_import/XMindImporter');

describe('MindMapController', () => {
  let controller: MindMapController;
  let mindMap: MindMap;
  let service: MindMapService;
  let renderer: Renderer;
  let styleEditor: StyleEditor;
  let eventBus: IMindMapEventBus;
  let mockEmit: Mock;
  let mockOnImportFile: Mock;
  let mockOnExportFile: Mock;
  let mockImportData: Mock;
  let fileHandler: FileHandler;
  let historyService: HistoryService;
  let clipboardService: ClipboardService;
  let searchService: SearchService;

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
      render: vi.fn(),
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
      emit: mockEmit,
      on: vi.fn(),
      off: vi.fn(),
    };

    mockOnImportFile = vi.fn();
    mockOnExportFile = vi.fn();
    fileHandler = {
      onImportFile: mockOnImportFile,
      onExportFile: mockOnExportFile,
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
      fileHandler,
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
    expect(mockEmit).toHaveBeenCalledWith('command', expect.objectContaining({ name: 'setTheme' }));

    controller.setLayoutMode('Left');
    expect(mockEmit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'setLayoutMode' }),
    );

    controller.moveNode('node-id', 'target-id', 'right');
    expect(mockEmit).toHaveBeenCalledWith('command', expect.objectContaining({ name: 'moveNode' }));
  });

  it('should use fileHandler for importXMind when provided', async () => {
    // Arrange
    const mockContent = new ArrayBuffer(8);
    (fileHandler.onImportFile as Mock).mockResolvedValue(mockContent);
    const mockData: MindMapData = {
      nodeData: { id: 'new-root', topic: 'New Map', children: [], root: true },
      theme: 'default',
    };

    // Mock XMindImporter prototype
    const extractSpy = vi
      .spyOn(XMindImporter.prototype, 'extractMindMapData')
      .mockResolvedValue(mockData);

    // Act
    await controller.importXMind();

    // Assert
    expect(mockEmit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'importXMind' }),
    );
    expect(mockOnImportFile).toHaveBeenCalledWith('xmind');
    expect(extractSpy).toHaveBeenCalled();
    // Verify that the argument passed to extractMindMapData is a File
    const callArgs = extractSpy.mock.calls[0];
    expect(callArgs[0]).toBeInstanceOf(File);
    expect((callArgs[0] as File).name).toBe('imported.xmind');

    expect(mockImportData).toHaveBeenCalledWith(mockData);
    expect(mockEmit).toHaveBeenCalledWith('model:load', mockData);

    extractSpy.mockRestore();
  });

  it('should not proceed if window.confirm is cancelled', async () => {
    // Arrange
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    // Root having children triggers confirm
    mindMap.root.addChild(new Node('child', 'Child'));

    // Act
    await controller.importXMind();

    // Assert
    expect(mockEmit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'importXMind' }),
    );
    expect(vi.mocked(window.confirm)).toHaveBeenCalled();
    expect(mockOnImportFile).not.toHaveBeenCalled();
  });

  it('should fallback to DOM input if fileHandler is NOT provided', async () => {
    // Arrange
    const controllerNoHandler = new MindMapController({
      mindMap,
      service,
      renderer,
      styleEditor,
      eventBus,
      historyService,
      clipboardService,
      searchService,
      viewportService: {
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
      } as unknown as ViewportService,
      navigationService: {
        navigate: vi.fn(),
        getNodeDirection: vi.fn().mockReturnValue('right'),
        ensureExplicitLayoutSides: vi.fn(),
        setLayoutMode: vi.fn(),
        getLayoutMode: vi.fn().mockReturnValue('Right'),
      } as unknown as NavigationService,
    });

    const createElementSpy = vi.spyOn(document, 'createElement');
    // bodyAppendSpy removed to fix warning

    // Act
    await controllerNoHandler.importXMind();

    // Assert
    expect(createElementSpy).toHaveBeenCalledWith('input');
    // We expect an input element to be created and clicked, but JSDOM behavior might vary.
    // Ideally check input.type = 'file' etc.
    // JSDOM createElement does return a functioning element.
  });

  it('should pass fileHandler to ImageExporter.exportToPng', async () => {
    // Arrange
    const exportSpy = vi.spyOn(ImageExporter.prototype, 'exportToPng').mockResolvedValue(undefined);

    // Act
    await controller.exportPng();

    // Assert
    expect(mockEmit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'exportPng' }),
    );
    expect(exportSpy).toHaveBeenCalledWith(renderer.container, fileHandler);
    exportSpy.mockRestore();
  });

  it('should pass fileHandler to ImageExporter.exportToSvg', async () => {
    // Arrange
    const exportSpy = vi.spyOn(ImageExporter.prototype, 'exportToSvg').mockResolvedValue(undefined);

    // Act
    await controller.exportSvg();

    // Assert
    expect(mockEmit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'exportSvg' }),
    );
    expect(exportSpy).toHaveBeenCalledWith(renderer.container, fileHandler);
    exportSpy.mockRestore();
  });

  it('should pass fileHandler to MarkdownExporter.export', async () => {
    // Arrange
    const exportSpy = vi.spyOn(MarkdownExporter.prototype, 'export').mockResolvedValue(undefined);

    // Act
    await controller.exportMarkdown();

    // Assert
    expect(mockEmit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'exportMarkdown' }),
    );
    expect(exportSpy).toHaveBeenCalledWith(mindMap, fileHandler);
    exportSpy.mockRestore();
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
