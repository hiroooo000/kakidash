/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { MindMapController } from '../../../src/presentation/logic/MindMapController';
import { MindMap } from '../../../src/domain/entities/MindMap';
import { Node } from '../../../src/domain/entities/Node';
import { MindMapService } from '../../../src/application/services/MindMapService';
import { Renderer } from '../../../src/presentation/components/Renderer';
import { StyleEditor } from '../../../src/presentation/components/StyleEditor';
import { IMindMapEventBus } from '../../../src/presentation/logic/MindMapController';
import { FileHandler } from '../../../src/domain/interfaces/FileHandler';
import { XMindImporter } from '../../../src/infrastructure/impl/XMindImporter';
import { MarkdownExporter } from '../../../src/presentation/logic/MarkdownExporter';
import { MindMapData } from '../../../src/domain/interfaces/MindMapData';
import { ImageExporter } from '../../../src/presentation/logic/ImageExporter';

// Remove vi.mock and use spyOn instead
// vi.mock('../../../src/infrastructure/impl/XMindImporter');

describe('MindMapController', () => {
  let controller: MindMapController;
  let mindMap: MindMap;
  let service: MindMapService;
  let renderer: Renderer;
  let styleEditor: StyleEditor;
  let eventBus: IMindMapEventBus;
  let fileHandler: FileHandler;

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

    service = {
      importData: vi.fn(),
      exportData: vi.fn(),
      addNode: vi.fn().mockReturnValue(new Node('new-id', 'Topic')),
      addSibling: vi.fn().mockReturnValue(new Node('sib-id', 'Topic')),
      insertParent: vi.fn().mockReturnValue(new Node('par-id', 'Topic')),
      removeNode: vi.fn().mockReturnValue(true),
      updateNodeTopic: vi.fn().mockReturnValue(true),
      updateNodeStyle: vi.fn().mockReturnValue(true),
      updateNodeIcon: vi.fn().mockReturnValue(true),
      updateNodeCustomWidth: vi.fn().mockReturnValue(true),
      reorderNode: vi.fn(),
      moveNode: vi.fn(),
      insertNodeAsParent: vi.fn(),
      setTheme: vi.fn(),
      undo: vi.fn().mockReturnValue(true),
      redo: vi.fn().mockReturnValue(true),
      toggleNodeFold: vi.fn().mockReturnValue(true),
      pasteNode: vi.fn().mockReturnValue(new Node('pasted-id', 'Topic')),
      cutNode: vi.fn(),
      addImageNode: vi.fn().mockReturnValue(new Node('img-id', 'Topic')),
      searchNodes: vi.fn().mockReturnValue([]),
    } as unknown as MindMapService;

    const container = document.createElement('div');
    renderer = {
      container,
      render: vi.fn(),
      updateTransform: vi.fn(),
      measureNode: vi.fn().mockReturnValue({ width: 100, height: 50 }),
    } as unknown as Renderer;

    styleEditor = {
      show: vi.fn(),
      hide: vi.fn(),
    } as unknown as StyleEditor;

    eventBus = {
      emit: vi.fn(),
    };

    fileHandler = {
      onImportFile: vi.fn(),
      onExportFile: vi.fn(),
    };

    controller = new MindMapController(
      mindMap,
      service,
      renderer,
      styleEditor,
      eventBus,
      fileHandler,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should emit command events for various operations', () => {
    // Arrange & Act
    controller.addNode('root', 'Child');
    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'addNode' }),
    );

    controller.undo();
    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'undo' }),
    );

    controller.redo();
    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'redo' }),
    );

    controller.setTheme('simple');
    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'setTheme' }),
    );

    controller.setLayoutMode('Left');
    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'setLayoutMode' }),
    );

    controller.moveNode('node-id', 'target-id', 'right');
    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'moveNode' }),
    );
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
    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'importXMind' }),
    );
    expect(fileHandler.onImportFile).toHaveBeenCalledWith('xmind');
    expect(extractSpy).toHaveBeenCalled();
    // Verify that the argument passed to extractMindMapData is a File
    const callArgs = extractSpy.mock.calls[0];
    expect(callArgs[0]).toBeInstanceOf(File);
    expect((callArgs[0] as File).name).toBe('imported.xmind');

    expect(service.importData).toHaveBeenCalledWith(mockData);
    expect(eventBus.emit).toHaveBeenCalledWith('model:load', mockData);

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
    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'importXMind' }),
    );
    expect(window.confirm).toHaveBeenCalled();
    expect(fileHandler.onImportFile).not.toHaveBeenCalled();
  });

  it('should fallback to DOM input if fileHandler is NOT provided', async () => {
    // Arrange
    const controllerNoHandler = new MindMapController(
      mindMap,
      service,
      renderer,
      styleEditor,
      eventBus,
      undefined, // No fileHandler
    );

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
    expect(eventBus.emit).toHaveBeenCalledWith(
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
    expect(eventBus.emit).toHaveBeenCalledWith(
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
    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'exportMarkdown' }),
    );
    expect(exportSpy).toHaveBeenCalledWith(mindMap, fileHandler);
    exportSpy.mockRestore();
  });
});
