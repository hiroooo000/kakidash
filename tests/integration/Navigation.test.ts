/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MindMapController } from '../../src/presentation/logic/MindMapController';
import { MindMap } from '../../src/features/core/domain/MindMap';
import { Node } from '../../src/features/core/domain/Node';
import { MindMapService } from '../../src/features/core/application/MindMapService';
import { Renderer } from '../../src/presentation/components/Renderer';
import { StyleEditor } from '../../src/features/theme/components/StyleEditor';
import { IMindMapEventBus } from '../../src/presentation/logic/MindMapController';
import { InteractionHandler } from '../../src/presentation/logic/InteractionHandler';

describe('MindMapController Navigation Integration', () => {
  let controller: MindMapController;
  let mindMap: MindMap;
  let service: MindMapService;
  let renderer: Renderer;
  let styleEditor: StyleEditor;
  let eventBus: IMindMapEventBus;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    const root = new Node('root', 'Root', null, true); // root, isRoot=true
    root.id = 'root';
    mindMap = new MindMap(root);
    // Real service (requires IdGenerator usually? Service constructor changed in recent View?)
    // In step 596: constructor(mindMap: MindMap, idGenerator: IdGenerator)
    // We need mock IdGenerator
    const idGenerator = {
      generate: () => 'mock-id-' + Math.random(),
      generateShort: () => 'short',
    };
    service = new MindMapService(mindMap, idGenerator);

    renderer = {
      container,
      render: vi.fn(),
      measureNode: vi.fn().mockReturnValue({ width: 100, height: 40 }),
      updateTransform: vi.fn(),
      updateSelection: vi.fn(),
      maxWidth: 200,
    } as unknown as Renderer;

    styleEditor = {
      show: vi.fn(),
      hide: vi.fn(),
      PALETTE: [],
      FONT_SIZES: [],
    } as unknown as StyleEditor;

    eventBus = {
      emit: vi.fn(),
    };

    controller = new MindMapController(
      mindMap,
      service,
      renderer,
      styleEditor,
      eventBus,

      { saveState: vi.fn(), undo: vi.fn(), redo: vi.fn(), canUndo: false, canRedo: false } as any,
      {
        copyNodes: vi.fn(),
        getClipboardNodes: vi.fn(),
        createPastedNodes: vi.fn().mockImplementation(() => []),
      } as any,
      { searchNodes: vi.fn().mockReturnValue([]) } as any,
      undefined,
    );

    // Mock interaction handler
    const interactionHandler = {
      updateSelection: vi.fn(),
      setReadOnly: vi.fn(),
      isReadOnly: false,
      options: {},
      getShortcuts: () => ({}),
      container: document.createElement('div'),
    } as unknown as InteractionHandler;
    controller.setInteractionHandler(interactionHandler);

    controller.init(800);
  });

  it('should navigate down between siblings and extend selection', () => {
    // Setup: Root -> Child 1, Child 2
    // Use service to add nodes to ensure integrity
    const c1 = service.addNode('root', 'Child 1');
    const c2 = service.addNode('root', 'Child 2');

    expect(c1).toBeDefined();
    expect(c2).toBeDefined();

    // Set Layout Mode explicitly to Right to correspond with default assumptions
    controller.setLayoutMode('Right');

    // Logic check: verify they are siblings
    expect(c1!.parentId).toBe('root');
    expect(c2!.parentId).toBe('root');
    expect(mindMap.root.children.length).toBe(2);
    expect(mindMap.root.children[0].id).toBe(c1!.id);
    expect(mindMap.root.children[1].id).toBe(c2!.id);

    // Initial Selection: Child 1
    controller.selectNode(c1!.id);
    expect(controller.getSelectedNodeId()).toBe(c1!.id);

    // Navigate Down with Shift
    // This uses REAL navigateDown logic (private method accessed via public navigateNode)
    controller.navigateNode(c1!.id, 'Down', true);

    // Assert
    expect(controller.getSelectedNodeId()).toBe(c2!.id); // Focus moved
    const selectedIds = controller.getSelectedNodeIds();
    expect(selectedIds).toHaveLength(2);
    expect(selectedIds).toContain(c1!.id);
    expect(selectedIds).toContain(c2!.id);
  });
});
