/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SvgGenerator } from '@/features/export_import/SvgGenerator';

// Mock XMLSerializer
global.XMLSerializer = class {
  serializeToString(node: Node) {
    return (node as unknown as Element).outerHTML || '';
  }
} as any;

describe('SvgGenerator', () => {
  let generator: SvgGenerator;
  let container: HTMLElement;

  beforeEach(() => {
    generator = new SvgGenerator();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('should generate SVG string from valid container structure', () => {
    // Setup mock structure
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.zIndex = '0';
    svg.style.position = 'absolute';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0 0 L10 10');
    svg.appendChild(path);
    container.appendChild(svg);

    const nodeLayer = document.createElement('div');
    nodeLayer.style.zIndex = '1';
    nodeLayer.style.position = 'absolute';

    const node = document.createElement('div');
    node.className = 'mindmap-node';
    node.style.left = '100px';
    node.style.top = '100px';
    node.style.width = '100px';
    node.style.height = '50px';
    node.textContent = 'Test Node';
    nodeLayer.appendChild(node);

    container.appendChild(nodeLayer);

    const result = generator.generate(container);

    expect(result).toContain('<svg');
    expect(result).toContain('Test Node');
    expect(result).toContain('M0 0 L10 10');
  });

  it('should throw error if layers are missing', () => {
    expect(() => generator.generate(container)).toThrow('Could not find mind map content layers.');
  });

  it('should handle empty node layer', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.zIndex = '0';
    svg.style.position = 'absolute';
    container.appendChild(svg);

    const nodeLayer = document.createElement('div');
    nodeLayer.style.zIndex = '1';
    nodeLayer.style.position = 'absolute';
    container.appendChild(nodeLayer);

    const result = generator.generate(container);
    expect(result).toContain('<svg');
  });
});
