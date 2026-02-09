import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeRegistry } from '../src/presentation/components/ThemeRegistry';
import { ThemeDefinition } from '../src/domain/interfaces/Theme';
import { MindMapStyles } from '../src/domain/interfaces/MindMapStyles';
import { DEFAULT_THEME, SIMPLE_THEME } from '../src/presentation/resources/ThemePresets';

describe('ThemeRegistry', () => {
  let registry: ThemeRegistry;

  beforeEach(() => {
    // Since it's a singleton, we might need to reset it or just get the instance.
    // Javascript singletons persist. We can't easily reset private instance without leakage.
    // But for testing registration, it's fine.
    registry = ThemeRegistry.getInstance();
  });

  it('should retrieve default themes', () => {
    const defaults = registry.getAvailableThemes();
    expect(defaults).toContain('default');
    expect(defaults).toContain('simple');
    expect(defaults).toContain('colorful');
    expect(defaults).toContain('dark');
  });

  it('should return default theme if requested theme does not exist', () => {
    const container = document.createElement('div');
    const theme = registry.applyTheme(container, 'non-existent');
    expect(theme.name).toBe(registry.getCurrentTheme().name);
    // Should ideally warn, but we can't easily test console.warn without spying
  });

  it('should register and retrieve a new theme', () => {
    const newTheme: ThemeDefinition = {
      name: 'test-theme',
      isDark: false,
      styles: JSON.parse(JSON.stringify(DEFAULT_THEME.styles)),
    };
    registry.registerTheme(newTheme);
    const retrieved = registry.getTheme('test-theme');
    expect(retrieved).toEqual(newTheme);
  });

  it('should set and apply custom theme from MindMapStyles', () => {
    const customStyles: MindMapStyles = {
      rootNode: { color: 'red', border: '5px solid red' },
      childNode: { background: 'blue' },
    };

    registry.setCustomTheme(customStyles);
    const customTheme = registry.getTheme('custom');

    expect(customTheme).toBeDefined();
    expect(customTheme?.styles.rootNode.color).toBe('red');
    expect(customTheme?.styles.rootNode.border).toBe('5px solid red');
    expect(customTheme?.styles.childNode.background).toBe('blue');

    // Defaults should be preserved
    expect(customTheme?.styles.connection.color).toBe(DEFAULT_THEME.styles.connection.color);
  });

  it('should apply CSS variables to container', () => {
    const container = document.createElement('div');
    const theme = SIMPLE_THEME;

    registry.applyTheme(container, 'simple');

    expect(container.style.getPropertyValue('--mindmap-root-border')).toBe(
      theme.styles.rootNode.border,
    );
    expect(container.style.getPropertyValue('--mindmap-child-background')).toBe(
      theme.styles.childNode.background,
    );
  });
});
