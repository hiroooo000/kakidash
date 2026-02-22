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

  it('should not render disabled features', () => {
    options.disabledFeatures = ['icon', 'export'];
    const palette = new CommandPalette(container, options);
    palette.show();

    const listItems = container.querySelectorAll('li');
    // Expected order:
    // 1. Search Nodes
    // 2. Import

    expect(listItems.length).toBe(2);
    expect(listItems[0].textContent).toContain('> Search Nodes');
    expect(listItems[1].textContent).toContain('> Import');
    expect(Array.from(listItems).some((li) => li.textContent?.includes('> Icon'))).toBe(false);
    expect(Array.from(listItems).some((li) => li.textContent?.includes('> Export'))).toBe(false);
  });

  it('should support custom commands', () => {
    const handler = vi.fn();
    const customCmd = {
      id: 'custom-1',
      topic: 'Custom Action',
      execute: handler,
    };

    // Register custom command
    commandPalette.addCustomCommand(customCmd);
    commandPalette.show();

    const listItems = container.querySelectorAll('li');
    // Default 4 + 1 custom
    expect(listItems.length).toBe(5);
    expect(listItems[4].textContent).toContain('Custom Action');

    // Simulate clicking the custom command
    const customItem = Array.from(listItems).find((li) =>
      li.textContent?.includes('Custom Action'),
    );
    customItem?.click();

    expect(handler).toHaveBeenCalled();
  });
});
