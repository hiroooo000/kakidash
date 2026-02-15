import { ThemeDefinition } from '../domain/Theme';

export const DEFAULT_THEME: ThemeDefinition = {
  name: 'default',
  isDark: false,
  styles: {
    rootNode: {
      color: 'var(--vscode-editor-foreground, black)',
      background: 'var(--vscode-editorWidget-background, var(--vscode-editor-background, white))',
      border: '2px solid var(--vscode-editor-foreground, #333)',
      fontWeight: 'bold',
      fontSize: '1.2em',
    },
    childNode: {
      color: 'var(--vscode-editor-foreground, black)',
      background: 'var(--vscode-editorWidget-background, var(--vscode-editor-background, white))',
      border: '1px solid var(--vscode-editorGroup-border, #ccc)',
    },
    connection: {
      color: '#ccc',
    },
    canvas: {
      background: 'var(--vscode-editor-background, transparent)',
    },
  },
};

export const SIMPLE_THEME: ThemeDefinition = {
  name: 'simple',
  isDark: false,
  styles: {
    rootNode: {
      color: 'var(--vscode-editor-foreground, black)',
      background: 'var(--vscode-editorWidget-background, var(--vscode-editor-background, white))',
      border: '2px solid var(--vscode-editor-foreground, #333)',
      fontWeight: 'bold',
      fontSize: '1.2em',
    },
    childNode: {
      color: 'var(--vscode-editor-foreground, black)',
      background: 'var(--vscode-editorWidget-background, var(--vscode-editor-background, white))',
      border: 'none',
    },
    connection: {
      color: '#ccc',
    },
    canvas: {
      background: 'var(--vscode-editor-background, transparent)',
    },
  },
};

const RAINBOW_PALETTE = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F1C40F',
  '#9B59B6',
  '#E67E22',
  '#1ABC9C',
];

export const COLORFUL_THEME: ThemeDefinition = {
  name: 'colorful',
  isDark: false,
  styles: {
    rootNode: {
      color: 'var(--vscode-editor-foreground, black)',
      background: 'var(--vscode-editorWidget-background, var(--vscode-editor-background, white))',
      border: '2px solid var(--vscode-editor-foreground, #333)',
      fontWeight: 'bold',
      fontSize: '1.2em',
    },
    childNode: {
      color: 'var(--vscode-editor-foreground, black)',
      background: 'var(--vscode-editorWidget-background, var(--vscode-editor-background, white))',
      // Border is dynamic
      border: '2px solid var(--node-color)',
    },
    connection: {
      color: 'var(--node-color)',
    },
    canvas: {
      background: 'var(--vscode-editor-background, transparent)',
    },
  },
  getColor: (index: number) => {
    return RAINBOW_PALETTE[index % RAINBOW_PALETTE.length];
  },
};

export const DARK_THEME: ThemeDefinition = {
  name: 'dark',
  isDark: true,
  styles: {
    rootNode: {
      color: '#eee',
      background: '#333',
      border: '2px solid #555',
      fontWeight: 'bold',
      fontSize: '1.2em',
    },
    childNode: {
      color: '#ddd',
      background: '#222',
      border: '1px solid #444',
    },
    connection: {
      color: '#555',
    },
    canvas: {
      background: '#1e1e1e',
    },
  },
};
