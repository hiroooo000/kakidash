/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionOrchestrator } from '../src/presentation/logic/InteractionOrchestrator';
import { CommandBus } from '../src/presentation/commands/CommandBus';
import { MindMap } from '../src/features/core/domain/MindMap';
import { Node } from '../src/features/core/domain/Node';

describe('Image Node Interactions (Internal)', () => {
  let container: HTMLElement;
  let orchestrator: InteractionOrchestrator;
  let commandBus: CommandBus;
  let mindMap: MindMap;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    commandBus = new CommandBus();
    const root = new Node('root', 'Root', null, true);
    mindMap = new MindMap(root);

    orchestrator = new InteractionOrchestrator({
      container,
      commandBus,
      mindMap,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      options: {} as any,
      getSelectedNodeId: () => 'root',
      getNodeElement: (id) => container.querySelector(`[data-id="${id}"]`) as HTMLElement,
      zoomNode: vi.fn(),
    });

    // Add a mock node element
    const nodeEl = document.createElement('div');
    nodeEl.setAttribute('data-id', 'root');
    container.appendChild(nodeEl);
  });

  afterEach(() => {
    orchestrator.destroy();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  it('should prevent "F2" from starting edit on image node', () => {
    const root = mindMap.root;
    root.image = 'data:image/png;base64,xxx';

    const zoomSpy = vi.spyOn(orchestrator as any, '_zoomNode');
    const editSpy = vi.spyOn(orchestrator['nodeEditor'], 'startEditing');

    const event = new KeyboardEvent('keydown', { key: 'F2' });
    document.dispatchEvent(event);

    expect(zoomSpy).toHaveBeenCalled();
    expect(editSpy).not.toHaveBeenCalled();
  });

  it('should allow "F2" to start edit on text node', () => {
    const editSpy = vi.spyOn(orchestrator['nodeEditor'], 'startEditing');

    const event = new KeyboardEvent('keydown', { key: 'F2' });
    document.dispatchEvent(event);

    expect(editSpy).toHaveBeenCalled();
  });
});
