import { ThemeDefinition } from '../../domain/interfaces/Theme';
import { DEFAULT_THEME, SIMPLE_THEME, COLORFUL_THEME, DARK_THEME } from '../resources/ThemePresets';
import { MindMapStyles } from '../../features/core/domain/MindMapStyles';

export class ThemeRegistry {
  private static instance: ThemeRegistry;
  private themes: Map<string, ThemeDefinition> = new Map();
  private currentTheme: ThemeDefinition = DEFAULT_THEME;

  private constructor() {
    this.registerTheme(DEFAULT_THEME);
    this.registerTheme(SIMPLE_THEME);
    this.registerTheme(COLORFUL_THEME);
    this.registerTheme(DARK_THEME);
  }

  public static getInstance(): ThemeRegistry {
    if (!ThemeRegistry.instance) {
      ThemeRegistry.instance = new ThemeRegistry();
    }
    return ThemeRegistry.instance;
  }

  public registerTheme(theme: ThemeDefinition): void {
    this.themes.set(theme.name, theme);
  }

  public getTheme(name: string): ThemeDefinition | undefined {
    return this.themes.get(name);
  }

  public getAvailableThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  public applyTheme(container: HTMLElement, themeName: string): ThemeDefinition {
    const theme = this.getTheme(themeName);
    if (!theme) {
      console.warn(`Theme '${themeName}' not found. Falling back to default.`);
      return this.currentTheme;
    }

    this.currentTheme = theme;
    this.applyStyles(container, theme);
    return theme;
  }

  public getCurrentTheme(): ThemeDefinition {
    return this.currentTheme;
  }

  public setCustomTheme(customStyles: MindMapStyles): void {
    const base = DEFAULT_THEME.styles;

    const theme: ThemeDefinition = {
      name: 'custom',
      isDark: false, // Default assumption, could be inferred potentially
      styles: {
        rootNode: {
          color: customStyles.rootNode?.color || base.rootNode.color,
          background: customStyles.rootNode?.background || base.rootNode.background,
          border: customStyles.rootNode?.border || base.rootNode.border,
          fontSize: base.rootNode.fontSize,
          fontWeight: base.rootNode.fontWeight,
        },
        childNode: {
          color: customStyles.childNode?.color || base.childNode.color,
          background: customStyles.childNode?.background || base.childNode.background,
          border: customStyles.childNode?.border || base.childNode.border,
          fontSize: base.childNode.fontSize,
        },
        connection: {
          color: customStyles.connection?.color || base.connection.color,
        },
        canvas: {
          background: customStyles.canvas?.background || base.canvas.background,
        },
      },
    };

    this.registerTheme(theme);
  }

  private applyStyles(container: HTMLElement, theme: ThemeDefinition): void {
    const s = theme.styles;

    // Root Node
    container.style.setProperty('--mindmap-root-color', s.rootNode.color);
    container.style.setProperty('--mindmap-root-background', s.rootNode.background);
    container.style.setProperty('--mindmap-root-border', s.rootNode.border);
    if (s.rootNode.fontSize)
      container.style.setProperty('--mindmap-root-font-size', s.rootNode.fontSize);
    if (s.rootNode.fontWeight)
      container.style.setProperty('--mindmap-root-font-weight', s.rootNode.fontWeight);

    // Child Node
    container.style.setProperty('--mindmap-child-color', s.childNode.color);
    container.style.setProperty('--mindmap-child-background', s.childNode.background);
    container.style.setProperty('--mindmap-child-border', s.childNode.border);
    if (s.childNode.fontSize)
      container.style.setProperty('--mindmap-child-font-size', s.childNode.fontSize);

    // Connection
    container.style.setProperty('--mindmap-connection-color', s.connection.color);

    // Canvas
    container.style.setProperty('--mindmap-canvas-background', s.canvas.background);
  }
}
