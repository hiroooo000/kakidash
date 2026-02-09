export interface ThemeDefinition {
  name: string;
  isDark: boolean;
  styles: {
    rootNode: {
      color: string;
      background: string;
      border: string;
      fontSize?: string;
      fontWeight?: string;
    };
    childNode: {
      color: string;
      background: string;
      border: string;
      fontSize?: string;
    };
    connection: {
      color: string;
    };
    canvas: {
      background: string;
    };
  };
  // Hook for dynamic color generation (e.g. Colorful theme)
  getColor?: (index: number, depth: number) => string;
}
