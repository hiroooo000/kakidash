import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MindMapController } from '../../src/presentation/logic/MindMapController';
import { MindMap } from '../../src/domain/entities/MindMap';
import { Node } from '../../src/domain/entities/Node';
import { MindMapService } from '../../src/application/services/MindMapService';
import { SvgRenderer } from '../../src/presentation/components/SvgRenderer';
import { StyleEditor } from '../../src/presentation/components/StyleEditor';
import { IMindMapEventBus } from '../../src/presentation/logic/MindMapController';

describe('MindMapController Resizing Fix', () => {
    let controller: MindMapController;
    let mindMap: MindMap;
    let service: MindMapService;
    let renderer: SvgRenderer;
    let styleEditor: StyleEditor;
    let eventBus: IMindMapEventBus;

    beforeEach(() => {
        mindMap = new MindMap(new Node('root', 'Root'));
        service = new MindMapService(mindMap, { generate: () => 'id' } as any);

        // Mock Renderer
        const container = document.createElement('div');
        renderer = new SvgRenderer(container);
        // Mock measureNode
        renderer.measureNode = vi.fn();

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
        (renderer.measureNode as any).mockReturnValue({ width: 120, height: 40 });

        // Spy on service update
        const updateSpy = vi.spyOn(service, 'updateNodeCustomWidth');

        // Trigger update width (+20)
        controller.updateNodeWidth(node.id, 20);

        // Should be 120 (current) + 20 (increment) = 140
        expect(updateSpy).toHaveBeenCalledWith(node.id, 140);
    });
});
