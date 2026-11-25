// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { LayoutSwitcher } from '../../../src/presentation/logic/LayoutSwitcher';

describe('LayoutSwitcher', () => {
  it('should render dark theme button and trigger onThemeChange("dark") on click', () => {
    const container = document.createElement('div');
    const onThemeChange = vi.fn();
    const switcher = new LayoutSwitcher(container, {
      onLayoutChange: vi.fn(),
      onThemeChange,
    });

    const darkBtn = switcher.themeButtons.get('dark');
    expect(darkBtn).toBeDefined();

    darkBtn!.click();
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('should include dark theme in icon descriptions for both en and ja', () => {
    const container = document.createElement('div');
    const switcher = new LayoutSwitcher(container, {
      onLayoutChange: vi.fn(),
      onThemeChange: vi.fn(),
    });

    expect(switcher.getIconDescriptions('en').some((d) => d.id === 'dark')).toBe(true);
    expect(switcher.getIconDescriptions('ja').some((d) => d.id === 'dark')).toBe(true);
  });
});
