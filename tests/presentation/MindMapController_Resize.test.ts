import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { MindMapController } from '../../src/presentation/logic/MindMapController';
import { MindMap } from '../../src/features/core/domain/MindMap';
import { Node } from '../../src/features/core/domain/Node';
import { MindMapService } from '../../src/features/core/application/MindMapService';
import { Renderer } from '../../src/presentation/components/Renderer';
import { StyleEditor } from '../../src/features/theme/components/StyleEditor';
import { IMindMapEventBus } from '../../src/presentation/logic/MindMapController';
import { IdGenerator } from '../../src/shared/kernel/IdGenerator';

describe('MindMapController Resizing Fix', () => {
  let controller: MindMapController;
  let mindMap: MindMap;
  let service: MindMapService;
  let renderer: Renderer;
  let styleEditor: StyleEditor;
  let eventBus: IMindMapEventBus;

  beforeEach(() => {
    mindMap = new MindMap(new Node('root', 'Root'));
    const mockIdGenerator: IdGenerator = { generate: () => 'id' };
    service = new MindMapService(mindMap, mockIdGenerator);

    // Mock Renderer
    renderer = {
      container: document.createElement('div'),
      maxWidth: -1,
      render: vi.fn(),
      updateTransform: vi.fn(),
      measureNode: vi.fn(),
    } as unknown as Renderer;

    const uiLayer = document.createElement('div');
    styleEditor = new StyleEditor(uiLayer);

    eventBus = { emit: vi.fn() };

    controller = new MindMapController(mindMap, service, renderer, styleEditor, eventBus);
  });

  it('should use measureNode width as starting width if customWidth is undefined', () => {
    const node = new Node('1', 'Test Node');
    // Use service to add node or just push to children since it's a unit test for controller
    // But controller looks up via mindMap.findNode
    mindMap.root.children.push(node);
    node.parentId = mindMap.root.id;

    // Mock measurement with width 120
    (renderer.measureNode as Mock).mockReturnValue({ width: 120, height: 40 });

    // Spy on service update
    const updateSpy = vi.spyOn(service, 'updateNodeCustomWidth');

    // Trigger update width (+20)
    controller.updateNodeWidth(node.id, 20);

    // Should be 120 (current) + 20 (increment) = 140
    expect(updateSpy).toHaveBeenCalledWith(node.id, 140);
  });
});
