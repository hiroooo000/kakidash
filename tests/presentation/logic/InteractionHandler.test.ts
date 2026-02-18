import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionHandler } from '../../../src/presentation/logic/InteractionHandler';
import { InteractionOptions } from '../../../src/presentation/types/InteractionOptions';

describe('InteractionHandler Multi-Select', () => {
  let container: HTMLElement;
  let options: InteractionOptions;
  let handler: InteractionHandler;

  beforeEach(() => {
    container = document.createElement('div');
    options = {
      onNodeClick: vi.fn(),
      onNavigate: vi.fn(),
      onAddChild: vi.fn(),
      onAddSibling: vi.fn(),
      onDeleteNode: vi.fn(),
      onUpdateNode: vi.fn(),
      onCopyNode: vi.fn(),
      onPasteNode: vi.fn(),
      onCutNode: vi.fn(),
      onDropNode: vi.fn(),
    };
    handler = new InteractionHandler(container, options);
    // Simulate selection
    handler.updateSelection('root');
  });

  afterEach(() => {
    handler.destroy();
  });

  it('should call onNavigate with extendSelection=true when Shift+ArrowUp is pressed', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      shiftKey: true,
      bubbles: true,
    });
    document.body.dispatchEvent(event);

    expect(options.onNavigate).toHaveBeenCalledWith('root', 'Up', true);
  });

  it('should call onNavigate with extendSelection=true when Shift+ArrowDown is pressed', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      shiftKey: true,
      bubbles: true,
    });
    document.body.dispatchEvent(event);

    expect(options.onNavigate).toHaveBeenCalledWith('root', 'Down', true);
  });

  it('should call onNavigate with extendSelection=false when ArrowUp is pressed without Shift', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      shiftKey: false,
      bubbles: true,
    });
    document.body.dispatchEvent(event);

    // Either called with undefined or false for 3rd arg.
    // Typescript optional arg usually undefined if omitted.
    // implementation calls it with ke.shiftKey which is false.
    expect(options.onNavigate).toHaveBeenCalledWith('root', 'Up', false);
  });
});
