/* eslint-disable */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ThemeService,
  ThemeServiceDependencies,
} from '../../../src/presentation/logic/ThemeService';
import { MindMap } from '../../../src/features/core/domain/MindMap';
import { Node } from '../../../src/features/core/domain/Node';
import { MindMapService } from '../../../src/features/core/application/MindMapService';
import { Renderer } from '../../../src/presentation/components/Renderer';
import { ThemeRegistry } from '../../../src/features/theme/registry/ThemeRegistry';
import { IMindMapEventBus } from '../../../src/presentation/logic/MindMapController';
import { LayoutSwitcher } from '../../../src/presentation/logic/LayoutSwitcher';
import { MindMapStyles } from '../../../src/features/theme/domain/MindMapStyles';

vi.mock('../../../src/features/theme/registry/ThemeRegistry', () => {
  return {
    ThemeRegistry: {
      getInstance: vi.fn().mockReturnValue({
        setCustomTheme: vi.fn(),
        applyTheme: vi.fn(),
      }),
    },
  };
});

describe('ThemeService', () => {
  let mindMap: MindMap;
  let mindMapService: MindMapService;
  let renderer: Renderer;
  let eventBus: IMindMapEventBus;
  let deps: ThemeServiceDependencies;
  let themeService: ThemeService;

  beforeEach(() => {
    mindMap = new MindMap(new Node('root', 'Root'));
    mindMapService = {
      setTheme: vi.fn(),
    } as unknown as MindMapService;

    renderer = {
      container: document.createElement('div'),
    } as unknown as Renderer;

    eventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };

    deps = {
      mindMap,
      service: mindMapService,
      renderer,
      eventBus,
    };

    themeService = new ThemeService(deps);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should apply initial theme normally if it is not custom', () => {
    mindMap.theme = 'simple';
    const mockRegistry = ThemeRegistry.getInstance();

    themeService.applyInitialTheme();

    expect(mockRegistry.applyTheme).toHaveBeenCalledWith(renderer.container, 'simple');
    expect(mockRegistry.setCustomTheme).not.toHaveBeenCalled();
  });

  it('should apply custom theme and set registry if initial theme is custom', () => {
    mindMap.theme = 'custom';
    const mockRegistry = ThemeRegistry.getInstance();

    const customStyles: MindMapStyles = { rootNode: { color: 'red' } };
    themeService.updateGlobalStyles(customStyles);

    vi.clearAllMocks(); // Clear to test applyInitialTheme clearly
    themeService.applyInitialTheme();

    expect(mockRegistry.setCustomTheme).toHaveBeenCalled();
    expect(mockRegistry.applyTheme).toHaveBeenCalledWith(renderer.container, 'custom');
  });

  it('should emit command, update service, and update layout when setTheme is called', () => {
    const layoutSwitcher = {
      setTheme: vi.fn(),
    } as unknown as LayoutSwitcher;

    themeService.setLayoutSwitcher(layoutSwitcher);

    const mockRegistry = ThemeRegistry.getInstance();

    themeService.setTheme('colorful', { saveState: true });

    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'setTheme', args: { theme: 'colorful' } }),
    );
    expect(mindMapService.setTheme).toHaveBeenCalledWith('colorful');
    expect(layoutSwitcher.setTheme).toHaveBeenCalledWith('colorful');
    expect(mockRegistry.applyTheme).toHaveBeenCalledWith(renderer.container, 'colorful');
    expect(eventBus.emit).toHaveBeenCalledWith('theme:changed' as any, 'colorful');
    expect(eventBus.emit).toHaveBeenCalledWith('model:change' as any, 'setTheme');
  });

  it('should not emit model:change or update LayoutSwitcher if options say otherwise', () => {
    const mockRegistry = ThemeRegistry.getInstance();

    themeService.setTheme('simple', { saveState: false, emitChange: false });

    // Should NOT emit model:change because saveState is false
    expect(eventBus.emit).not.toHaveBeenCalledWith('model:change' as any, 'setTheme');
    expect(mindMapService.setTheme).toHaveBeenCalledWith('simple');
    expect(mockRegistry.applyTheme).toHaveBeenCalledWith(renderer.container, 'simple');
  });

  it('should update global styles and save state when updateGlobalStyles is called', () => {
    mindMap.theme = 'custom';
    const mockRegistry = ThemeRegistry.getInstance();

    const styles: MindMapStyles = { canvas: { background: '#333' } };
    themeService.updateGlobalStyles(styles);

    expect(eventBus.emit).toHaveBeenCalledWith(
      'command',
      expect.objectContaining({ name: 'updateGlobalStyles' }),
    );
    expect(mockRegistry.setCustomTheme).toHaveBeenCalled();
    expect(mockRegistry.applyTheme).toHaveBeenCalledWith(renderer.container, 'custom');
    expect(eventBus.emit).toHaveBeenCalledWith('theme:changed' as any, 'custom');
    expect(eventBus.emit).toHaveBeenCalledWith('model:change' as any, 'updateGlobalStyles');
  });
});
