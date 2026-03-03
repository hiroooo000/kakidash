/* eslint-disable */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileIOService } from '../../../src/features/io/FileIOService';
import { MindMap } from '../../../src/features/core/domain/MindMap';
import { Node } from '../../../src/features/core/domain/Node';

// ImageExporter, MarkdownExporter, XMindImporter のモック
vi.mock('../../../src/features/io/ImageExporter', () => {
  const ImageExporter = vi.fn();
  ImageExporter.prototype.exportToPng = vi.fn().mockResolvedValue(undefined);
  ImageExporter.prototype.exportToSvg = vi.fn().mockResolvedValue(undefined);
  return { ImageExporter };
});
vi.mock('../../../src/features/io/MarkdownExporter', () => {
  const MarkdownExporter = vi.fn();
  MarkdownExporter.prototype.export = vi.fn().mockResolvedValue(undefined);
  return { MarkdownExporter };
});
vi.mock('../../../src/features/io/XMindImporter', () => {
  const XMindImporter = vi.fn();
  XMindImporter.prototype.extractMindMapData = vi.fn().mockResolvedValue({
    nodeData: { id: 'import-root', topic: 'Imported', children: [] },
  });
  return { XMindImporter };
});

describe('FileIOService', () => {
  let mindMap: MindMap;
  let renderer: any;
  let eventBus: any;
  let fileHandler: any;
  let service: FileIOService;

  beforeEach(() => {
    mindMap = new MindMap(new Node('root', 'Root Topic'));
    renderer = { container: document.createElement('div') };
    eventBus = { emit: vi.fn() };
    fileHandler = { onImportFile: vi.fn() };

    service = new FileIOService({
      mindMap,
      renderer,
      eventBus,
      fileHandler,
    });

    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('exportPng', () => {
    it('should emit command and call exporter', async () => {
      await service.exportPng();
      expect(eventBus.emit).toHaveBeenCalledWith('command', { name: 'exportPng' });
    });
  });

  describe('exportSvg', () => {
    it('should emit command and call exporter', async () => {
      await service.exportSvg();
      expect(eventBus.emit).toHaveBeenCalledWith('command', { name: 'exportSvg' });
    });
  });

  describe('exportMarkdown', () => {
    it('should emit command and call exporter', async () => {
      await service.exportMarkdown();
      expect(eventBus.emit).toHaveBeenCalledWith('command', { name: 'exportMarkdown' });
    });
  });

  describe('importXMind', () => {
    it('should emit command and return parsed data if fileHandler provides content', async () => {
      fileHandler.onImportFile.mockResolvedValue('fake-file-content');
      const data = await service.importXMind();

      expect(eventBus.emit).toHaveBeenCalledWith('command', { name: 'importXMind' });
      expect(data).toBeDefined();
      expect(data?.nodeData.topic).toBe('Imported');
    });

    it('should ask for confirmation if mindmap is not empty', async () => {
      mindMap.root.children.push(new Node('child', 'Child Topic')); // Not empty
      fileHandler.onImportFile.mockResolvedValue('fake-file-content');

      await service.importXMind();
      expect(global.confirm).toHaveBeenCalled();
    });

    it('should cancel import if confirmation is rejected', async () => {
      mindMap.root.children.push(new Node('child', 'Child Topic'));
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(false)); // Reject

      const data = await service.importXMind();
      expect(data).toBeNull();
    });
  });
});
