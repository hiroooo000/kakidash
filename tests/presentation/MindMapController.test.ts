/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MindMapController } from '../../src/presentation/logic/MindMapController';
import { MindMap } from '../../src/features/core/domain/MindMap';
import { Node } from '../../src/features/core/domain/Node';
import { MindMapService } from '../../src/features/core/application/MindMapService';
import { Renderer } from '../../src/presentation/components/Renderer';
import { StyleEditor } from '../../src/features/theme/components/StyleEditor';
import { InteractionHandler } from '../../src/presentation/logic/InteractionHandler';
import { CryptoIdGenerator } from '../../src/shared/infrastructure/CryptoIdGenerator';
import { ThemeRegistry } from '../../src/features/theme/registry/ThemeRegistry';

// Mock dependencies
vi.mock('../../src/features/core/application/MindMapService');
// vi.mock('../../src/presentation/components/SvgRenderer'); // No longer needed as we use interface mock
vi.mock('../../src/features/theme/components/StyleEditor');
vi.mock('../../src/presentation/logic/InteractionHandler');

describe('MindMapController', () => {
  let controller: MindMapController;
  let mindMap: MindMap;
  let service: any; // Using any for mocked instance
  let renderer: Renderer;
  let styleEditor: any;
  let interactionHandler: any;
  let eventBus: any;
  let rootNode: Node;

  beforeEach(() => {
    rootNode = new Node('root', 'Root');
    mindMap = new MindMap(rootNode);

    // Instantiate mocks
    const idGenerator = new CryptoIdGenerator();
    service = new MindMapService(mindMap, idGenerator);
    // Mock Renderer
    renderer = {
      container: document.createElement('div'),
      maxWidth: -1,
      render: vi.fn(),
      updateTransform: vi.fn(),
      measureNode: vi.fn(),
      updateSelection: vi.fn(),
    };
    styleEditor = new StyleEditor(document.createElement('div'));
    interactionHandler = new InteractionHandler(document.createElement('div'), {} as any);

    eventBus = {
      emit: vi.fn() as any,
    };

    // Fix renderer container for ensureNodeVisible and other layout logic
    const mockContainer = document.createElement('div');
    Object.defineProperty(mockContainer, 'clientWidth', { value: 1000 });
    Object.defineProperty(mockContainer, 'clientHeight', { value: 800 });
    // Mock getBoundingClientRect
    mockContainer.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 1000,
        height: 800,
        right: 1000,
        bottom: 800,
      }) as DOMRect;
    // Mock querySelector
    mockContainer.querySelector = vi.fn().mockImplementation(() => {
      return {
        getBoundingClientRect: () =>
          ({ left: 10, top: 10, width: 100, height: 50, right: 110, bottom: 60 }) as DOMRect,
      };
    });

    renderer.container = mockContainer;
    // renderer methods already mocked above or can be overridden here
    renderer.render = vi.fn();
    renderer.updateTransform = vi.fn();

    controller = new MindMapController(mindMap, service, renderer, styleEditor, eventBus);

    // Wire up InteractionHandler
    controller.setInteractionHandler(interactionHandler);

    // Reset service mocks return values
    service.addNode.mockReset();
    service.removeNode.mockReset();
    service.removeNodes = vi.fn();
    service.updateNodesStyle = vi.fn();
    service.copyNodes = vi.fn();
    service.cutNodes = vi.fn();
  });

  it('init should set initial pan and start loop', () => {
    controller.init(1000);
    expect(renderer.container.clientWidth).toBe(1000);
    // init sets pan to 0.2 * width = 200
    expect(controller['panX']).toBe(200);
  });

  it('init should apply initial theme', () => {
    const registry = ThemeRegistry.getInstance();
    const applySpy = vi.spyOn(registry, 'applyTheme');

    controller.init(1000);

    expect(applySpy).toHaveBeenCalledWith(expect.anything(), 'default');
    applySpy.mockRestore();
  });

  it('addNode should call service and emit events', () => {
    const newNode = new Node('new1', 'New Node');
    service.addNode.mockReturnValue(newNode);

    const result = controller.addNode('root', 'New Node');

    expect(service.addNode).toHaveBeenCalledWith('root', 'New Node', undefined);
    expect(renderer.render).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith('node:add', { id: 'new1', topic: 'New Node' });
    expect(eventBus.emit).toHaveBeenCalledWith('model:change', undefined);
    expect(result).toBe(newNode);
  });

  it('addChildNode (interaction) should add node and start editing', () => {
    const newNode = new Node('child1', 'Child');
    service.addNode.mockReturnValue(newNode);

    controller.addChildNode('root');

    // Interaction specific: emitChange should be false initially (pending creation)
    expect(service.addNode).toHaveBeenCalledWith('root', 'New topic', undefined);
    // Should NOT emit model:change yet (passed emitChange: false)
    expect(eventBus.emit).not.toHaveBeenCalledWith('model:change', undefined);

    expect(controller['pendingNodeCreation']).toBe(true);
    expect(interactionHandler.editNode).toHaveBeenCalledWith('child1');
    expect(controller['selectedNodeId']).toBe('child1');
  });

  it('deleteNode should call service and emit remove', () => {
    service.removeNode.mockReturnValue(true);
    controller.deleteNode('child1');

    expect(service.removeNode).toHaveBeenCalledWith('child1');
    expect(eventBus.emit).toHaveBeenCalledWith('node:remove', 'child1');
    expect(eventBus.emit).toHaveBeenCalledWith('model:change', undefined);
  });

  it('updateNode should emit node:update and model:change', () => {
    service.updateNodeTopic.mockReturnValue(true);
    controller.updateNode('root', { topic: 'Updated' });

    expect(service.updateNodeTopic).toHaveBeenCalledWith('root', 'Updated');
    expect(eventBus.emit).toHaveBeenCalledWith('node:update', { id: 'root', topic: 'Updated' });
    expect(eventBus.emit).toHaveBeenCalledWith('model:change', undefined);
  });

  it('should support multiple node selection', () => {
    controller.selectNodes(['id1', 'id2']);

    const selectedIds = controller.getSelectedNodeIds();
    expect(selectedIds).toContain('id1');
    expect(selectedIds).toContain('id2');
    expect(selectedIds.length).toBe(2);

    // Legacy support
    // Expect the last selected or primary to be returned by getSelectedNodeId?
    // Implementation detail: usually the last one added or the first one.
    // Let's assume it returns one of them or the "primary" one (last clicked).
    // For now just check it returns something valid.
    const validIds = ['id1', 'id2'];
    expect(validIds).toContain(controller.getSelectedNodeId());
  });

  it('selectNode should clear previous selection', () => {
    controller.selectNodes(['id1', 'id2']);
    controller.selectNode('id3');

    const selectedIds = controller.getSelectedNodeIds();
    expect(selectedIds).toEqual(['id3']);
    expect(controller.getSelectedNodeId()).toBe('id3');
  });

  it('selectNodes should emit selection:change event', () => {
    controller.selectNodes(['id1', 'id2']);
    expect(eventBus.emit).toHaveBeenCalledWith('selection:change', ['id1', 'id2']);
  });

  it('navigateNode with extendSelection should Select Range', () => {
    // Setup siblings
    const child1 = new Node('c1', 'Child 1', 'root');
    const child2 = new Node('c2', 'Child 2', 'root');
    const child3 = new Node('c3', 'Child 3', 'root');
    const root = mindMap.root;
    root.addChild(child1);
    root.addChild(child2);
    root.addChild(child3);
    mindMap.rebuildIndex();

    // Mock service to return nodes? Service delegates to MindMap usually for add.
    // But navigateNode uses MindMap directly.
    // MindMap references are already set up above.

    // Start at c1
    controller.selectNode('c1');
    expect(controller.getSelectedNodeId()).toBe('c1');

    // Navigate Down with Shift (to c2)
    // We need to mock navigateDown implementation/logic?
    // navigateNode calls navigateDown(node).
    // navigateDown uses mindMap structure.
    // We didn't spy on navigateDown, we test the real logic?
    // But navigateDown implementation depends on layout logic (getNodeDirection).
    // Root children direction?
    // For root children, it depends on layoutMode. Default Right.
    // c1, c2, c3 are children of root.
    // navigateDown from c1 should go to c2.

    controller.navigateNode('c1', 'Down', true);

    const selectedIds = controller.getSelectedNodeIds();
    expect(selectedIds).toContain('c1');
    expect(selectedIds).toContain('c2');
    expect(selectedIds.length).toBe(2);
    expect(controller.getSelectedNodeId()).toBe('c2'); // Focus moved

    // Navigate Down again (to c3)
    controller.navigateNode('c2', 'Down', true);
    const selectedIds2 = controller.getSelectedNodeIds();
    expect(selectedIds2).toContain('c1');
    expect(selectedIds2).toContain('c2');
    expect(selectedIds2).toContain('c3');
    expect(selectedIds2.length).toBe(3);
    expect(controller.getSelectedNodeId()).toBe('c3');
  });

  it('navigateNode without extendSelection should reset selection', () => {
    // Setup siblings
    const child1 = new Node('c1', 'Child 1', 'root');
    const child2 = new Node('c2', 'Child 2', 'root');

    mindMap.root.addChild(child1);
    mindMap.root.addChild(child2);
    mindMap.rebuildIndex();

    controller.selectNodes(['c1', 'c2']);
    // Focus is c2 (last one)

    // Navigate Up (to c1) without shift
    controller.navigateNode('c2', 'Up', false);

    const selectedIds = controller.getSelectedNodeIds();
    expect(selectedIds).toEqual(['c1']);
    expect(controller.getSelectedNodeId()).toBe('c1');
  });

  describe('Bulk Operations', () => {
    it('deleteNode with multiple selection should remove all selected nodes', () => {
      controller.selectNodes(['id1', 'id2']);
      service.removeNodes.mockReturnValue(true);

      // Act: delete one of the selected nodes
      controller.deleteNode('id1');

      expect(service.removeNodes).toHaveBeenCalledWith(expect.arrayContaining(['id1', 'id2']));
      expect(eventBus.emit).toHaveBeenCalledWith('model:change', undefined);
    });

    it('updateNode style with multiple selection should update all selected nodes', () => {
      controller.selectNodes(['id1', 'id2']);
      service.updateNodesStyle.mockReturnValue(true);

      controller.updateNode('id1', { style: { color: 'red' } });

      expect(service.updateNodesStyle).toHaveBeenCalledWith(
        expect.arrayContaining(['id1', 'id2']),
        { color: 'red' },
      );
      expect(eventBus.emit).toHaveBeenCalledWith('model:change', undefined);
    });

    it('copyNode with multiple selection should copy all selected nodes', () => {
      controller.selectNodes(['id1', 'id2']);

      controller.copyNode('id1');
      expect(service.copyNodes).toHaveBeenCalledWith(expect.arrayContaining(['id1', 'id2']));
    });

    it('cutNode with multiple selection should cut all selected nodes', () => {
      controller.selectNodes(['id1', 'id2']);

      controller.cutNode('id1');
      expect(service.cutNodes).toHaveBeenCalledWith(expect.arrayContaining(['id1', 'id2']));
    });
  });
});
