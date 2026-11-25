/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MindMapController } from '../../../src/presentation/logic/MindMapController';
import { MindMap } from '../../../src/features/core/domain/MindMap';
import { Node } from '../../../src/features/core/domain/Node';
import { MindMapService } from '../../../src/features/core/application/MindMapService';
import { IdGenerator } from '../../../src/shared/kernel/IdGenerator';
import { ImageStore } from '../../../src/features/core/application/ImageStore';
import { CommandBus } from '../../../src/presentation/commands/CommandBus';
import { HistoryService } from '../../../src/features/core/application/HistoryService';

class MockIdGenerator implements IdGenerator {
  generate(): string {
    return `mock-id-${Date.now()}`;
  }
}

describe('MindMapController Images and GC', () => {
  let controller: MindMapController;
  let mindMap: MindMap;
  let imageStore: ImageStore;
  let service: MindMapService;
  let historyService: HistoryService;
  let mockRenderer: {
    container: HTMLElement;
    renderFromLayout: ReturnType<typeof vi.fn>;
    measureNode: ReturnType<typeof vi.fn>;
    updateSelection: ReturnType<typeof vi.fn>;
    zoomNode: ReturnType<typeof vi.fn>;
  };
  let mockImageProcessingService: {
    generateThumbnail: ReturnType<typeof vi.fn>;
  };
  let mockStyleEditor: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const root = new Node('root', 'Root');
    mindMap = new MindMap(root);
    const idGenerator = new MockIdGenerator();
    service = new MindMapService(mindMap, idGenerator);
    imageStore = new ImageStore();
    historyService = new HistoryService(10);
    mockRenderer = {
      container: document.createElement('div'),
      renderFromLayout: vi.fn(),
      measureNode: vi.fn().mockReturnValue({ width: 100, height: 50 }),
      updateSelection: vi.fn(),
      zoomNode: vi.fn(),
    };
    mockImageProcessingService = {
      generateThumbnail: vi.fn(),
    };
    mockStyleEditor = {
      show: vi.fn(),
      hide: vi.fn(),
    };

    controller = new MindMapController({
      mindMap,
      service,
      renderer: mockRenderer as any,
      styleEditor: mockStyleEditor as any,
      eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any,
      historyService,
      clipboardService: {} as any,
      searchService: {} as any,
      viewportService: {
        startAnimationLoop: vi.fn(),
        setInitialPan: vi.fn(),
        applyTransform: vi.fn(),
        ensureNodeVisible: vi.fn(),
      } as any,
      navigationService: {} as any,
      fileIOService: {} as any,
      themeService: { applyInitialTheme: vi.fn() } as any,
      commandBus: new CommandBus(),
      imageStore,
      imageProcessingService: mockImageProcessingService as any,
    });
  });

  it('should collect active images and garbage collect unused images', () => {
    // Add 3 images to store
    imageStore.addImage('img1.png', 'data1');
    imageStore.addImage('img2.png', 'data2');
    imageStore.addImage('img3.png', 'data3');

    // Create nodes that reference img1 and img3
    const node1 = new Node('node1', 'N1', 'root');
    node1.imageRef = 'img1.png';
    const node2 = new Node('node2', 'N2', 'root');
    node2.imageRef = 'img3.png';

    mindMap.root.addChild(node1);
    mindMap.root.addChild(node2);
    mindMap.registerNode(node1);
    mindMap.registerNode(node2);

    expect(imageStore.getAllRefs().length).toBe(3);

    // Run GC
    controller.gcImages();

    // Now img2.png should be deleted
    const refs = imageStore.getAllRefs();
    expect(refs.length).toBe(2);
    expect(refs).toContain('img1.png');
    expect(refs).toContain('img3.png');
    expect(refs).not.toContain('img2.png');
  });

  it('should return a map of active images', () => {
    imageStore.addImage('img1.png', 'data1');
    const node1 = new Node('node1', 'N1', 'root');
    node1.imageRef = 'img1.png';
    mindMap.root.addChild(node1);
    mindMap.registerNode(node1);

    const images = controller.getImages();
    expect(images['img1.png']).toBe('data1');
  });

  it('should hide StyleEditor when selecting a hybrid image node (thumbnail/imageRef)', () => {
    const imgNode = new Node('img-node', '', 'root');
    imgNode.thumbnail = 'data:image/png;base64,thumb';
    imgNode.imageRef = 'img1.png';
    mindMap.root.addChild(imgNode);
    mindMap.registerNode(imgNode);

    controller.setInteractionOrchestrator({
      updateSelection: vi.fn(),
      isReadOnlyState: false,
    } as unknown as Parameters<MindMapController['setInteractionOrchestrator']>[0]);

    controller.selectNode('img-node');

    expect(mockStyleEditor.hide).toHaveBeenCalled();
    expect(mockStyleEditor.show).not.toHaveBeenCalled();
  });

  it('should not save undo state if pasteImage thumbnail generation fails', async () => {
    const saveStateSpy = vi.spyOn(historyService, 'saveState');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockImageProcessingService.generateThumbnail.mockRejectedValue(new Error('Invalid image'));

    controller.pasteImage('root', 'data:image/png;base64,bad');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(saveStateSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should save undo state and add image node when pasteImage succeeds', async () => {
    const saveStateSpy = vi.spyOn(historyService, 'saveState');
    mockImageProcessingService.generateThumbnail.mockResolvedValue({
      thumbnailBase64: 'data:image/png;base64,thumb',
      width: 100,
      height: 80,
    });

    controller.pasteImage('root', 'data:image/png;base64,original');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(saveStateSpy).toHaveBeenCalledTimes(1);
    expect(mindMap.root.children).toHaveLength(1);
    expect(mindMap.root.children[0].imageRef).toMatch(/^img_[a-zA-Z0-9_-]+\.png$/);
  });
});
