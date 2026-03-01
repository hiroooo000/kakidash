import { Renderer } from './Renderer';
import { MindMap } from '../../features/core/domain/MindMap';
import { ThemeRegistry } from '../../features/theme/registry/ThemeRegistry';
import { Node } from '../../features/core/domain/Node';
import { LayoutMode } from '../../features/core/domain/LayoutMode';
import { SVG_ICONS } from '../../features/theme/resources/Icons';
import { LayoutResult } from '../layout/LayoutTypes';

export interface SvgRendererOptions {
  onImageZoom?: (active: boolean) => void;
  onToggleFold?: (nodeId: string) => void;
}

export class SvgRenderer implements Renderer {
  container: HTMLElement;
  svg: SVGSVGElement;
  nodeContainer: HTMLDivElement;
  options: SvgRendererOptions;
  maxWidth: number = -1;
  private measureCache: Map<string, { width: number; height: number }> = new Map();
  private nodeElementMap: Map<string, HTMLElement> = new Map();
  private previousSelectedIds: Set<string> = new Set();

  constructor(container: HTMLElement, options: SvgRendererOptions = {}) {
    this.container = container;
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';
    this.container.style.backgroundColor = 'var(--vscode-editor-background, transparent)';

    // SVG Layer for lines
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.zIndex = '0';
    this.svg.style.pointerEvents = 'none'; // Click through to nodes
    this.svg.style.overflow = 'visible';
    this.svg.style.transformOrigin = '0 0';
    this.container.appendChild(this.svg);

    // Div Layer for nodes
    this.nodeContainer = document.createElement('div');
    this.nodeContainer.style.position = 'absolute';
    this.nodeContainer.style.top = '0';
    this.nodeContainer.style.left = '0';
    this.nodeContainer.style.width = '100%';
    this.nodeContainer.style.height = '100%';
    this.nodeContainer.style.zIndex = '1';
    this.nodeContainer.style.transformOrigin = '0 0';
    this.container.appendChild(this.nodeContainer);
    this.options = options;
  }

  renderFromLayout(
    layout: LayoutResult,
    mindMap: MindMap,
    selectedNodeIds: Set<string>,
    layoutMode: LayoutMode = 'Right',
  ): void {
    // Clear previous render
    this.svg.innerHTML = '';
    this.nodeContainer.innerHTML = '';
    this.measureCache.clear();
    this.nodeElementMap.clear();
    this.previousSelectedIds.clear();

    // Render connections first (bottom layer)
    layout.connections.forEach((conn) => {
      const targetNode = mindMap.findNode(conn.toNodeId);
      const color = targetNode ? this.getThemeColor(targetNode, mindMap) : '#ccc';
      this.drawConnection(conn.fromX, conn.fromY, conn.toX, conn.toY, color, mindMap.theme);
    });

    // Render nodes
    layout.nodes.forEach((nodeLayout) => {
      const node = mindMap.findNode(nodeLayout.nodeId);
      if (node) {
        this.renderNodeElement(
          node,
          nodeLayout.x,
          nodeLayout.y,
          nodeLayout.width,
          nodeLayout.direction,
          selectedNodeIds,
          layoutMode,
          mindMap,
        );
      }
    });

    // Sync previous selection state for future delta updates (Bug Fix)
    this.previousSelectedIds = new Set(selectedNodeIds);
  }

  updateTransform(panX: number, panY: number, scale: number = 1): void {
    const transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    this.svg.style.transform = transform;
    this.nodeContainer.style.transform = transform;
  }

  private getThemeColor(node: Node, mindMap: MindMap): string {
    const currentTheme = ThemeRegistry.getInstance().getCurrentTheme();
    // Default fallback

    if (currentTheme.getColor) {
      // ... existing colorful logic adapted
      if (node.isRoot) return '#333';

      // Find the direct child of root that is an ancestor of this node (or is this node)
      let current = node;
      while (current.parentId && current.parentId !== mindMap.root.id) {
        const parent = mindMap.findNode(current.parentId);
        if (!parent) break;
        current = parent;
      }

      const rootChildren = mindMap.root.children;
      const index = rootChildren.findIndex((c) => c.id === current.id);

      if (index !== -1) {
        // Calculate depth for potential future use, though colorful usually just uses index
        // const depth = this.getNodeDepth(node, mindMap);
        return currentTheme.getColor(index, 0);
      }
    }

    // Fallback to connection color from theme style if not dynamic
    return currentTheme.styles.connection.color;
  }

  private renderNodeElement(
    node: Node,
    x: number,
    y: number,
    nodeWidth: number,
    direction: 'left' | 'right',
    selectedNodeIds: Set<string>,
    layoutMode: LayoutMode,
    mindMap: MindMap,
  ): void {
    const isRoot = node.isRoot;
    const currentTheme = ThemeRegistry.getInstance().getCurrentTheme();
    const el = document.createElement('div');
    el.dataset.id = node.id;

    // Ensure absolute positioning
    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    if (node.image) {
      // Image Node
      const img = document.createElement('img');
      img.src = node.image;
      if (node.imageSize) {
        if (node.imageSize.width > 150) {
          img.style.width = '150px';
          img.style.height = 'auto';
        } else {
          img.style.width = `${node.imageSize.width}px`;
          img.style.height = `${node.imageSize.height}px`;
        }
      } else {
        img.style.maxWidth = '150px';
        img.style.maxHeight = '150px';
      }
      img.style.display = 'block';
      el.appendChild(img);

      // Zoom overlay/button
      const zoomBtn = document.createElement('div');
      // Lucide 'zoom-in' icon
      zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-icon-foreground, #333)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>`;
      zoomBtn.style.position = 'absolute';
      zoomBtn.style.bottom = '5px';
      zoomBtn.style.right = '5px';
      zoomBtn.style.backgroundColor = 'var(--vscode-editor-background, rgba(255, 255, 255, 0.9))'; // Slightly more opaque
      zoomBtn.style.borderRadius = '50%';
      zoomBtn.style.width = '24px';
      zoomBtn.style.height = '24px';
      zoomBtn.style.display = 'flex';
      zoomBtn.style.justifyContent = 'center';
      zoomBtn.style.alignItems = 'center';
      zoomBtn.style.cursor = 'pointer';
      zoomBtn.title = 'Zoom Image';
      zoomBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'; // Add subtle shadow for depth
      el.appendChild(zoomBtn);

      zoomBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent selection
        this.showImageModal(node.image!);
      });

      el.style.padding = '5px'; // Less padding for images
    } else {
      // Text Node
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = node.isRoot ? 'center' : 'flex-start';

      if (node.icon) {
        const svgData = SVG_ICONS[node.icon];
        if (svgData) {
          const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svgIcon.setAttribute('viewBox', svgData.viewBox);
          svgIcon.setAttribute('width', '20');
          svgIcon.setAttribute('height', '20');
          svgIcon.style.width = '20px';
          svgIcon.style.height = '20px';
          svgIcon.style.marginRight = '8px'; // Increased margin for left alignment feel
          svgIcon.style.flexShrink = '0';
          svgIcon.innerHTML = svgData.path;
          el.appendChild(svgIcon);
        } else {
          // Fallback for emojis or legacy icons
          const iconSpan = document.createElement('span');
          iconSpan.textContent = node.icon;
          iconSpan.style.marginRight = '6px';
          iconSpan.style.fontSize = '1.2em';
          el.appendChild(iconSpan);
        }
      }

      const textSpan = document.createElement('span');
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = node.topic.split(urlRegex);

      parts.forEach((part) => {
        if (part.match(urlRegex)) {
          const a = document.createElement('a');
          a.href = part;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = part;
          a.style.color = '#3498DB'; // Link color
          a.style.textDecoration = 'underline';
          a.style.cursor = 'pointer';

          // Stop propagation of click to prevent node selection when clicking link
          a.addEventListener('mousedown', (e) => e.stopPropagation());
          a.addEventListener('click', (e) => e.stopPropagation());

          textSpan.appendChild(a);
        } else {
          textSpan.appendChild(document.createTextNode(part));
        }
      });

      el.appendChild(textSpan);

      const effectiveMaxWidth =
        node.presentation.customWidth ?? (this.maxWidth !== -1 ? this.maxWidth : undefined);

      if (effectiveMaxWidth !== undefined) {
        textSpan.style.whiteSpace = 'pre-wrap';
        textSpan.style.wordWrap = 'break-word';
        textSpan.style.overflowWrap = 'anywhere';
        textSpan.style.minWidth = '0'; // Allow flex to shrink
        el.style.maxWidth = `${effectiveMaxWidth}px`;
        el.style.width = 'max-content';
      } else {
        textSpan.style.whiteSpace = 'pre';
      }
    }

    el.className = 'mindmap-node';
    if (!node.isRoot) {
      el.draggable = true;
    }

    el.style.position = 'absolute';

    // Initial styling to measure
    el.style.padding = '8px 12px';
    if (node.image) el.style.padding = '5px';

    // Setting color
    // Setting color
    if (currentTheme.name === 'custom') {
      if (node.isRoot) {
        el.style.color = 'var(--mindmap-root-color, var(--vscode-editor-foreground, black))';
      } else {
        el.style.color = 'var(--mindmap-child-color, var(--vscode-editor-foreground, black))';
      }
    } else {
      if (node.isRoot) {
        el.style.color = 'var(--mindmap-root-color)';
      } else {
        el.style.color = 'var(--mindmap-child-color)';
      }
    }

    // Theme-based Border
    // WE NOW RELY ON CSS VARIABLES SET BY ThemeRegistry
    // But for specific logic like "Simple theme has no border", the CSS variable should handle it (border: none).
    // The only exception is dynamic colorful border.

    const themeColor = this.getThemeColor(node, mindMap); // mindMap is likely present if we are rendering

    if (currentTheme.name === 'colorful') {
      // Colorful theme specific overrides (dynamic color)
      // We can't easily do this via static CSS variables unless we set style directly.
      el.style.border = `2px solid ${themeColor}`;
    } else if (currentTheme.name === 'custom') {
      // Custom
      if (node.isRoot) {
        const defaultRootBorder = '2px solid var(--vscode-editor-foreground, #333)';
        el.style.border = `var(--mindmap-root-border, ${defaultRootBorder})`;
      } else {
        el.style.border = `var(--mindmap-child-border, 1px solid #ccc)`;
      }
    } else {
      // Default / Simple / Dark
      // Use CSS variables
      if (node.isRoot) {
        el.style.border = 'var(--mindmap-root-border)';
      } else {
        el.style.border = 'var(--mindmap-child-border)';
      }
    }

    el.style.borderRadius = '4px';
    if (node.isRoot) {
      el.style.fontSize = '1.2em';
      el.style.fontWeight = 'bold';
      if (currentTheme.name !== 'custom') {
        el.style.border = '2px solid var(--vscode-editor-foreground, #333)';
      }
    }

    // Apply custom styles
    if (node.style.color) el.style.color = node.style.color;
    if (node.style.fontSize) el.style.fontSize = node.style.fontSize;
    if (node.style.fontWeight) el.style.fontWeight = node.style.fontWeight;
    if (node.style.fontStyle) el.style.fontStyle = node.style.fontStyle;

    // Background handling
    if (node.style.background) {
      el.style.backgroundColor = node.style.background;
    } else if (currentTheme.name === 'custom') {
      // Custom variable fallbacks
      if (node.isRoot) {
        el.style.backgroundColor = `var(--mindmap-root-background, var(--vscode-editor-background, white))`;
      } else {
        el.style.backgroundColor = `var(--mindmap-child-background, var(--vscode-editor-background, white))`;
      }
    } else {
      // Standard themes via Registry variables
      if (node.isRoot) {
        el.style.backgroundColor = 'var(--mindmap-root-background)';
      } else {
        el.style.backgroundColor = 'var(--mindmap-child-background)';
      }
    }

    let finalX = x;
    if (direction === 'left' && !isRoot) {
      finalX = x - nodeWidth;
    } else if (isRoot) {
      // Center root on X
      // If we assume X passed in is center, then finalX = X - width/2
      // But in original code x=50.
      // Let's assume passed X is the 'connection point' from parent.
      // Root has no parent. Let's assume X is center of screen if passed from render().
      // If render passes 0, maybe we shift it?
      // render passes 0. Let's make root absolute center?
      // The pan/zoom handles the view. Let's place root at 0,0 and expand.
      // Then 0,0 is center of root.
      finalX = x - nodeWidth / 2;
    }

    el.style.left = `${finalX}px`;
    el.style.top = `${y}px`;
    el.style.transform = 'translate(0, -50%)'; // Vertically centered on Y

    el.style.zIndex = '10';
    el.style.cursor = 'default';
    el.style.userSelect = 'none';

    if (selectedNodeIds.has(node.id)) {
      // Use outline for selection to preserve theme border
      el.style.outline = '2px solid var(--vscode-focusBorder, #007bff)';
      el.style.boxShadow = '0 0 5px var(--vscode-focusBorder, rgba(0, 123, 255, 0.5))';
      el.dataset.selected = 'true';
      // Do not overwrite border
    }

    this.nodeContainer.appendChild(el);
    this.nodeElementMap.set(node.id, el);

    if (node.children.length === 0) return;

    // Toggle Fold Button
    if (this.options.onToggleFold) {
      const positions: number[] = [];

      if (isRoot && layoutMode === 'Both') {
        // Both sides
        positions.push(finalX + nodeWidth); // Right
        positions.push(finalX); // Left
      } else {
        // Single side
        let isRightSide = direction === 'right';
        if (isRoot) {
          if (layoutMode === 'Left') isRightSide = false;
          else isRightSide = true; // Right
        }
        positions.push(isRightSide ? finalX + nodeWidth : finalX);
      }

      positions.forEach((btnX) => {
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'mindmap-toggle-btn';
        toggleBtn.innerHTML = node.presentation.isFolded ? '+' : '-';
        toggleBtn.style.position = 'absolute';
        toggleBtn.style.width = '16px';
        toggleBtn.style.height = '16px';
        toggleBtn.style.fontSize = '12px';
        toggleBtn.style.lineHeight = '14px';
        toggleBtn.style.textAlign = 'center';
        toggleBtn.style.borderRadius = '50%';
        toggleBtn.style.border = '1px solid var(--vscode-widget-border, #999)';
        toggleBtn.style.backgroundColor = 'var(--vscode-editor-background, #fff)';
        toggleBtn.style.color = 'var(--vscode-editor-foreground, #000)';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.zIndex = '11';
        toggleBtn.style.userSelect = 'none';

        // Adjust position to sit squarely on the edge (center of button on the border line)
        const edgeOffset = 0;
        toggleBtn.style.left = `${btnX + edgeOffset}px`;
        toggleBtn.style.top = `${y}px`;
        toggleBtn.style.transform = `translate(-50%, -50%)`;

        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.options.onToggleFold?.(node.id);
        });

        this.nodeContainer.appendChild(toggleBtn);
      });
    }
  }

  public measureNode(node: Node, mindMap?: MindMap): { width: number; height: number } {
    if (this.measureCache.has(node.id)) {
      return this.measureCache.get(node.id)!;
    }

    if (node.image) {
      if (node.imageSize) {
        if (node.imageSize.width > 150) {
          const ratio = node.imageSize.height / node.imageSize.width;
          const result = { width: 160, height: 150 * ratio + 10 };
          this.measureCache.set(node.id, result);
          return result;
        }
        const result = { width: node.imageSize.width + 10, height: node.imageSize.height + 10 };
        this.measureCache.set(node.id, result);
        return result;
      }
      // Return fixed size for images + padding estimate
      // Max 150x150 + padding 10
      const result = { width: 160, height: 160 };
      this.measureCache.set(node.id, result);
      return result;
    }

    const el = document.createElement('div');
    el.className = 'mindmap-node';
    el.style.visibility = 'hidden';
    el.style.position = 'absolute';

    // Replicate render logic for measurement
    el.style.display = 'flex';
    el.style.alignItems = 'center';

    if (node.icon) {
      const svgData = SVG_ICONS[node.icon];
      if (svgData) {
        // SVG Placeholder for measurement
        const iconPlaceholder = document.createElement('div');
        iconPlaceholder.style.width = '20px';
        iconPlaceholder.style.height = '20px';
        iconPlaceholder.style.marginRight = '8px';
        iconPlaceholder.style.flexShrink = '0';
        el.appendChild(iconPlaceholder);
      } else {
        // Fallback for emojis
        const iconSpan = document.createElement('span');
        iconSpan.textContent = node.icon;
        iconSpan.style.marginRight = '6px';
        iconSpan.style.fontSize = '1.2em';
        el.appendChild(iconSpan);
      }
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = node.topic;
    el.appendChild(textSpan);

    const effectiveMaxWidth =
      node.presentation.customWidth ?? (this.maxWidth !== -1 ? this.maxWidth : undefined);

    if (effectiveMaxWidth !== undefined) {
      textSpan.style.whiteSpace = 'pre-wrap';
      textSpan.style.wordWrap = 'break-word';
      textSpan.style.overflowWrap = 'anywhere';
      textSpan.style.minWidth = '0'; // Allow flex to shrink
      el.style.maxWidth = `${effectiveMaxWidth}px`;
      el.style.width = 'max-content';
    } else {
      textSpan.style.whiteSpace = 'pre';
    }
    el.style.padding = '8px 12px';
    // Remove static border assignment here as we do it below based on theme
    // el.style.border = '1px solid var(--vscode-editorGroup-border, #ccc)';

    // Ensure it has a width constraint if we want wrapping behavior similar to render?
    // Actually, in renderNode we don't constrain width (it expands).
    // But if we want it to wrap we might need a max-width?
    // For now, let's assume it expands naturally or follows some CSS rule if 'mindmap-node' has it.
    // The reported issue is about height not being accounted for.

    // Copy-pasted border logic to match renderNode
    // Measurement logic needs similar updates
    // For brevity, using simpler approach or copying the logic:
    const mTheme = ThemeRegistry.getInstance().getCurrentTheme();
    const mThemeColor = mindMap ? this.getThemeColor(node, mindMap) : '#ccc';

    if (mTheme.name === 'colorful') {
      el.style.border = `2px solid ${mThemeColor}`;
    } else if (mTheme.name === 'custom') {
      if (node.isRoot) {
        el.style.border = `var(--mindmap-root-border, 2px solid #333)`;
      } else {
        el.style.border = `var(--mindmap-child-border, 1px solid #ccc)`;
      }
    } else {
      if (node.isRoot) {
        el.style.border = 'var(--mindmap-root-border)';
      } else {
        el.style.border = 'var(--mindmap-child-border)';
      }
    }

    if (node.isRoot) {
      el.style.fontSize = '1.2em';
      el.style.fontWeight = 'bold';
      if (mTheme.name !== 'custom') {
        el.style.border = '2px solid var(--vscode-editor-foreground, #333)';
      }
    }

    // Apply custom styles to measurement element
    if (node.style.color) el.style.color = node.style.color;
    if (node.style.fontSize) el.style.fontSize = node.style.fontSize;
    if (node.style.fontWeight) el.style.fontWeight = node.style.fontWeight;
    if (node.style.fontStyle) el.style.fontStyle = node.style.fontStyle;
    if (node.style.background) el.style.backgroundColor = node.style.background;

    this.nodeContainer.appendChild(el);
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    this.nodeContainer.removeChild(el);

    const result = { width: width || 100, height: height || 40 };
    this.measureCache.set(node.id, result);
    return result;
  }

  private drawConnection(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string = '#ccc',
    theme: string = 'default',
  ): void {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Bezier curve
    const c1x = x1 + (x2 - x1) / 2;
    const c2x = x1 + (x2 - x1) / 2;

    const d = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;

    path.setAttribute('d', d);

    if (theme === 'custom') {
      // Use style.stroke to allow CSS variable override for Custom theme
      path.style.stroke = `var(--mindmap-connection-color, ${color})`;
    } else {
      // Use ThemeRegistry variable
      path.style.stroke = 'var(--mindmap-connection-color, #ccc)';
      // But wait, getThemeColor returns specific color for colorful or dynamic.
      // If color arg is passed, we should use it if it differs from default?
      // getThemeColor returns var(--node-color) for colorful? No, it returns hex.
      // If color is passed and it is a hex (not var), we should use it.
      // For 'colorful', color is dynamic.

      const currentTheme = ThemeRegistry.getInstance().getCurrentTheme();
      if (currentTheme.name === 'colorful') {
        path.style.stroke = color;
      } else {
        path.style.stroke = 'var(--mindmap-connection-color)';
      }
    }

    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '2');

    this.svg.appendChild(path);
  }

  private showImageModal(imageData: string): void {
    if (this.options.onImageZoom) {
      this.options.onImageZoom(true);
    }
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.cursor = 'zoom-out';

    const img = document.createElement('img');
    img.src = imageData;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';

    modal.appendChild(img);
    document.body.appendChild(modal);

    // Forward declaration for closure
    // eslint-disable-next-line prefer-const
    let handleKeydown: (e: KeyboardEvent) => void;

    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
      if (handleKeydown) {
        document.removeEventListener('keydown', handleKeydown, true);
      }
      if (this.options.onImageZoom) {
        this.options.onImageZoom(false);
      }
      this.container.focus();
    };

    handleKeydown = (e: KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();
      closeModal();
    };

    document.addEventListener('keydown', handleKeydown, true);

    modal.addEventListener('click', () => {
      closeModal();
    });
  }

  /**
   * Get the cached DOM element for a given node ID.
   */
  getNodeElement(nodeId: string): HTMLElement | undefined {
    return this.nodeElementMap.get(nodeId);
  }

  /**
   * Update selection styles without full DOM rebuild.
   * Only modifies outline and boxShadow on existing DOM elements.
   */
  updateSelection(selectedNodeIds: Set<string>): void {
    // Clear previous selection styles
    for (const prevId of this.previousSelectedIds) {
      if (!selectedNodeIds.has(prevId)) {
        const el = this.nodeElementMap.get(prevId);
        if (el) {
          el.style.outline = '';
          el.style.boxShadow = '';
          delete el.dataset.selected;
        }
      }
    }

    // Apply new selection styles
    for (const id of selectedNodeIds) {
      const el = this.nodeElementMap.get(id);
      if (el) {
        el.style.outline = '2px solid var(--vscode-focusBorder, #007bff)';
        el.style.boxShadow = '0 0 5px var(--vscode-focusBorder, rgba(0, 123, 255, 0.5))';
        el.dataset.selected = 'true';
      }
    }

    this.previousSelectedIds = new Set(selectedNodeIds);
  }
}
