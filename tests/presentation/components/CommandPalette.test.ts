import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CommandPalette,
  CommandPaletteOptions,
} from '../../../src/presentation/components/CommandPalette';

describe('CommandPalette', () => {
  let container: HTMLElement;
  let options: CommandPaletteOptions;
  let commandPalette: CommandPalette;

  beforeEach(() => {
    container = document.createElement('div');
    options = {
      onInput: vi.fn(),
      onSelect: vi.fn(),
      onIconSelect: vi.fn(),
      onCommandSelect: vi.fn(),
      onClose: vi.fn(),
    };
    commandPalette = new CommandPalette(container, options);
  });

  it('should render items in the correct order', () => {
    commandPalette.show();

    const listItems = container.querySelectorAll('li');
    // Expected order:
    // 1. Icon
    // 2. Search Nodes
    // 3. Import
    // 4. Export

    // Note: The actual text content might contain icons or be slightly different,
    // so we'll check for the topic text which we know from the source.
    // Based on source:
    // { id: 'icon', topic: '> Icon', type: 'command' }
    // { id: 'search-nodes', topic: '> Search Nodes', type: 'command' }
    // { id: 'import', topic: '> Import', type: 'command' }
    // { id: 'export', topic: '> Export', type: 'command' }

    expect(listItems.length).toBe(4);
    expect(listItems[0].textContent).toContain('> Icon');
    expect(listItems[1].textContent).toContain('> Search Nodes');
    expect(listItems[2].textContent).toContain('> Import');
    expect(listItems[3].textContent).toContain('> Export');
  });
});
