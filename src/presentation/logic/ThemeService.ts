import { MindMap } from '../../features/core/domain/MindMap';
import { MindMapService } from '../../features/core/application/MindMapService';
import { Renderer } from '../components/Renderer';
import { LayoutSwitcher } from './LayoutSwitcher';
import { IMindMapEventBus } from './MindMapController';
import { ThemeRegistry } from '../../features/theme/registry/ThemeRegistry';
import { Theme } from '../../features/core/domain/MindMapData';
import { MindMapStyles } from '../../features/theme/domain/MindMapStyles';

export interface ThemeServiceDependencies {
  mindMap: MindMap;
  service: MindMapService;
  renderer: Renderer;
  eventBus: IMindMapEventBus;
}

/**
 * Service for handling Theme and Style updates for the MindMap.
 */
export class ThemeService {
  private mindMap: MindMap;
  private service: MindMapService;
  private renderer: Renderer;
  private eventBus: IMindMapEventBus;
  private layoutSwitcher?: LayoutSwitcher;

  private savedCustomStyles: MindMapStyles = {
    rootNode: { border: '2px solid #aeb6bf', background: '#ebf5fb', color: '#2e4053' },
    childNode: { border: '1px solid #d5d8dc', background: '#fdfefe', color: '#2c3e50' },
    canvas: { background: '#ffffff' },
    connection: { color: '#abb2b9' },
  };

  /**
   * Initializes a new instance of the ThemeService.
   * @param deps Dependencies required for Theme/Style operations
   */
  constructor(deps: ThemeServiceDependencies) {
    this.mindMap = deps.mindMap;
    this.service = deps.service;
    this.renderer = deps.renderer;
    this.eventBus = deps.eventBus;
  }

  /**
   * Sets the optional layoutSwitcher reference to propagate theme changes
   * @param switcher LayoutSwitcher instance
   */
  public setLayoutSwitcher(switcher: LayoutSwitcher): void {
    this.layoutSwitcher = switcher;
  }

  /**
   * Applies the mind map's initial theme upon loading.
   */
  public applyInitialTheme(): void {
    const theme = this.mindMap.theme;
    if (theme === 'custom') {
      const registry = ThemeRegistry.getInstance();
      registry.setCustomTheme(this.savedCustomStyles);
      registry.applyTheme(this.renderer.container, 'custom');
    } else {
      ThemeRegistry.getInstance().applyTheme(this.renderer.container, theme);
    }
  }

  /**
   * Updates global styles and persists them to savedCustomStyles.
   * Emits a command and change events.
   * @param styles MindMapStyles to update
   */
  public updateGlobalStyles(styles: MindMapStyles): void {
    this.eventBus.emit('command', { name: 'updateGlobalStyles', args: { styles } });
    if (styles.rootNode)
      this.savedCustomStyles.rootNode = { ...this.savedCustomStyles.rootNode, ...styles.rootNode };
    if (styles.childNode)
      this.savedCustomStyles.childNode = {
        ...this.savedCustomStyles.childNode,
        ...styles.childNode,
      };
    if (styles.connection)
      this.savedCustomStyles.connection = {
        ...this.savedCustomStyles.connection,
        ...styles.connection,
      };
    if (styles.canvas)
      this.savedCustomStyles.canvas = { ...this.savedCustomStyles.canvas, ...styles.canvas };

    if (this.mindMap.theme === 'custom') {
      const registry = ThemeRegistry.getInstance();
      registry.setCustomTheme(this.savedCustomStyles);
      registry.applyTheme(this.renderer.container, 'custom');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.eventBus.emit('theme:changed' as any, this.mindMap.theme);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.eventBus.emit('model:change' as any, 'updateGlobalStyles'); // trigger layout update
  }

  /**
   * Applies the given theme, updates underlying models and the layout.
   * @param theme Theme to apply
   * @param options Execution Options (saveState, emitChange)
   */
  public setTheme(theme: Theme, options: { saveState?: boolean; emitChange?: boolean } = {}): void {
    const { saveState = true, emitChange = true } = options;

    if (emitChange) {
      this.eventBus.emit('command', { name: 'setTheme', args: { theme } });
    }

    this.service.setTheme(theme);
    if (this.layoutSwitcher) this.layoutSwitcher.setTheme(theme);

    if (theme === 'custom') {
      const registry = ThemeRegistry.getInstance();
      registry.setCustomTheme(this.savedCustomStyles);
      registry.applyTheme(this.renderer.container, 'custom');
    } else {
      ThemeRegistry.getInstance().applyTheme(this.renderer.container, theme);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.eventBus.emit('theme:changed' as any, theme);
    if (saveState) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.eventBus.emit('model:change' as any, 'setTheme');
    }
  }

  /**
   * Getter for currently saved custom styles.
   */
  public getSavedCustomStyles(): MindMapStyles {
    return this.savedCustomStyles;
  }
}
