// Local declaration for File System Access API to avoid compilation errors
interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}
interface FileSystemWritableFileStream extends WritableStream {
  write(data: Blob | string | BufferSource): Promise<void>;
  close(): Promise<void>;
}
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}
declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}

export class ImageExporter {
  public async exportToSvg(container: HTMLElement): Promise<void> {
    try {
      const svgString = this.createSvgString(container);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      await this.saveFile(blob, 'mindmap.svg', [
        { description: 'SVG File', accept: { 'image/svg+xml': ['.svg'] } },
      ]);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Failed to export SVG:', e);
        alert('Failed to export SVG.');
      }
    }
  }

  public async exportToPng(container: HTMLElement): Promise<void> {
    try {
      const svgString = this.createSvgString(container);
      // Use Data URI instead of Blob URL to avoid "tainted canvas" security error
      // when drawing SVG with foreignObject to canvas.
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      const url = `data:image/svg+xml;base64,${base64}`;

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');

            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
              if (blob) {
                this.saveFile(blob, 'mindmap.png', [
                  { description: 'PNG Image', accept: { 'image/png': ['.png'] } },
                ])
                  .then(() => resolve())
                  .catch((err) => reject(err instanceof Error ? err : new Error(String(err))));
              } else {
                reject(new Error('Failed to generate PNG blob.'));
              }
            }, 'image/png');
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        };
        img.onerror = () => {
          reject(new Error('Failed to load SVG for PNG conversion'));
        };
        img.src = url;
      });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Failed to export PNG:', e);
        alert('Failed to export PNG.');
      }
    }
  }

  private async showSavePicker(
    options: SaveFilePickerOptions,
  ): Promise<FileSystemFileHandle | null> {
    if (typeof window.showSaveFilePicker !== 'function') {
      alert('Your browser does not support the File System Access API required for saving files.');
      return null;
    }
    return window.showSaveFilePicker(options);
  }

  private async saveFile(
    blob: Blob,
    filename: string,
    types: { description: string; accept: Record<string, string[]> }[],
  ): Promise<void> {
    const handle = await this.showSavePicker({
      suggestedName: filename,
      types,
    });
    if (!handle) return; // Not supported or cancelled (though cancelled usually throws AbortError)

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  private createSvgString(container: HTMLElement): string {
    // 1. Identify content layers
    // Strict SVG finding logic: Look for the SVG with zIndex '0' (lines)
    const svgs = container.querySelectorAll('svg');
    let lineLayer: SVGSVGElement | null = null;

    // Find the correct SVG layer (zIndex 0, absolute)
    for (let i = 0; i < svgs.length; i++) {
      const el = svgs[i];
      if (el.style.zIndex === '0' && el.style.position === 'absolute') {
        lineLayer = el;
        break;
      }
    }

    // Fallback: If strict check fails, try the first direct child SVG if it exists
    if (!lineLayer && svgs.length > 0 && svgs[0].parentElement === container) {
      lineLayer = svgs[0];
    }

    const divs = container.querySelectorAll('div');
    let nodeLayer: HTMLDivElement | null = null;
    for (let i = 0; i < divs.length; i++) {
      const div = divs[i];
      if (div.style.zIndex === '1' && div.style.position === 'absolute') {
        nodeLayer = div;
        break;
      }
    }

    if (!lineLayer || !nodeLayer) {
      throw new Error('Could not find mind map content layers.');
    }

    // 2. Measure Bounds
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const nodes = nodeLayer.children;
    if (nodes.length === 0) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    } else {
      for (let i = 0; i < nodes.length; i++) {
        const nodeEl = nodes[i] as HTMLElement;
        const left = parseFloat(nodeEl.style.left || '0');
        const top = parseFloat(nodeEl.style.top || '0');
        const width = nodeEl.offsetWidth;
        const height = nodeEl.offsetHeight;

        const visualTop = top - height / 2;
        const visualBottom = top + height / 2;

        if (left < minX) minX = left;
        if (visualTop < minY) minY = visualTop;
        if (left + width > maxX) maxX = left + width;
        if (visualBottom > maxY) maxY = visualBottom;
      }
    }

    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    // 3. Clone and Prepare CSS
    const computedStyle = window.getComputedStyle(container);
    const knownVariables = [
      '--mindmap-connection-color',
      '--mindmap-root-color',
      '--mindmap-child-color',
      '--mindmap-root-border',
      '--mindmap-child-border',
      '--mindmap-root-background',
      '--mindmap-child-background',
      '--vscode-editor-foreground',
      '--vscode-editor-background',
      '--vscode-widget-border',
      '--vscode-focusBorder',
    ];

    const cssVariables: string[] = [];
    knownVariables.forEach((varName) => {
      const value = computedStyle.getPropertyValue(varName).trim();
      if (value) {
        cssVariables.push(`${varName}: ${value};`);
      }
    });

    const cssStyleParams = cssVariables.join(' ');
    const fontFamily = computedStyle.fontFamily;

    // 4. Construct SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.cssText = cssStyleParams;

    // Background Rect
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', width.toString());
    bgRect.setAttribute('height', height.toString());
    bgRect.setAttribute('fill', computedStyle.backgroundColor || '#ffffff');
    svg.appendChild(bgRect);

    // Group to shift content to fit viewBox
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${-minX}, ${-minY})`);

    // 4a. Lines (Paths)
    const paths = lineLayer.querySelectorAll('path');
    paths.forEach((p) => {
      const clone = p.cloneNode(true) as SVGElement;

      // Robust Style Extraction
      const s = window.getComputedStyle(p);

      // 1. Stroke Color
      let strokeColor = s.stroke;
      if (!strokeColor || strokeColor === 'none') {
        // Fallback to inline style if computed is empty or none
        strokeColor = p.style.stroke;
      }
      // If likely a variable string, rely on css variables injected in the root.
      // But if it was relying on computed style resolving it, and it failed...
      // Check if it's still var(...)
      if (!strokeColor || strokeColor === 'none') {
        // Ultimate fallback (ThemeRegistry default)
        strokeColor = '#cccccc';
      }
      clone.style.stroke = strokeColor;

      // 2. Stroke Width
      let strokeWidth = s.strokeWidth;
      // If 0px or auto or invalid, use attribute or default
      if (!strokeWidth || strokeWidth === '0px' || strokeWidth === 'auto') {
        strokeWidth = p.getAttribute('stroke-width') || '2px';
      }
      clone.style.strokeWidth = strokeWidth;

      clone.style.fill = 'none';

      g.appendChild(clone);
    });

    // 4b. Nodes (ForeignObject)
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('x', '0');
    fo.setAttribute('y', '0');
    fo.setAttribute('width', (maxX + padding).toString());
    fo.setAttribute('height', (maxY + padding).toString());
    fo.style.overflow = 'visible';

    const foDiv = document.createElement('div');
    foDiv.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    foDiv.style.cssText = `position: relative; width: 100%; height: 100%; font-family: ${fontFamily}; ${cssStyleParams}`;

    // Clone nodes
    const children = nodeLayer.children;
    for (let i = 0; i < children.length; i++) {
      const node = children[i].cloneNode(true) as HTMLElement;
      foDiv.appendChild(node);
    }

    fo.appendChild(foDiv);
    g.appendChild(fo);
    svg.appendChild(g);

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  }
}
