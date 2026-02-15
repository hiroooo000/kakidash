/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ImageExporter } from '../../../src/features/export_import/ImageExporter';

// Mock XMLSerializer
global.XMLSerializer = class {
  serializeToString(node: Node) {
    return (node as unknown as Element).outerHTML || '';
  }
} as any;

// Mock Blob
global.Blob = class {
  content: any[];
  options: any;
  constructor(content: any[], options: any) {
    this.content = content;
    this.options = options;
  }
} as any;

// Mock URL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('ImageExporter', () => {
  let exporter: ImageExporter;
  let container: HTMLElement;
  let showSaveFilePickerMock: any;
  let fileHandleMock: any;
  let writableMock: any;

  beforeEach(() => {
    exporter = new ImageExporter();
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock structure
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0 0 L10 10');
    svg.appendChild(path);
    container.appendChild(svg);

    const nodeLayer = document.createElement('div');
    nodeLayer.style.zIndex = '1';
    nodeLayer.style.position = 'absolute';

    // Add a node
    const node = document.createElement('div');
    node.className = 'mindmap-node';
    node.style.left = '100px';
    node.style.top = '100px';
    node.style.width = '100px';
    node.style.height = '50px';
    nodeLayer.appendChild(node);

    container.appendChild(nodeLayer);

    // Mock File System Access API
    writableMock = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    fileHandleMock = {
      createWritable: vi.fn().mockResolvedValue(writableMock),
    };
    showSaveFilePickerMock = vi.fn().mockResolvedValue(fileHandleMock);
    window.showSaveFilePicker = showSaveFilePickerMock;
    window.alert = vi.fn(); // Mock alert
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('exportToSvg calls showSaveFilePicker and writes blob', async () => {
    await exporter.exportToSvg(container);

    expect(showSaveFilePickerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        types: expect.arrayContaining([
          expect.objectContaining({
            accept: { 'image/svg+xml': ['.svg'] },
          }),
        ]),
      }),
    );

    expect(fileHandleMock.createWritable).toHaveBeenCalled();
    expect(writableMock.write).toHaveBeenCalled();
    expect(writableMock.close).toHaveBeenCalled();
  });

  it('exportToPng creates Canvas and calls showSaveFilePicker', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalImage = global.Image;
    const mockImage: any = {
      width: 800,
      height: 600,
      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      },
    };
    global.Image = class {
      constructor() {
        return mockImage;
      }
    } as any;
    window.Image = global.Image; // Ensure window.Image is also mocked

    // Mock Canvas
    const mockContext = {
      drawImage: vi.fn(),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toBlob: vi.fn((cb) => cb(new Blob([], {}))),
    };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      if (tagName === 'canvas') return mockCanvas as any;
      return originalCreateElement(tagName, options);
    });

    await exporter.exportToPng(container);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    expect(showSaveFilePickerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        types: expect.arrayContaining([
          expect.objectContaining({
            accept: { 'image/png': ['.png'] },
          }),
        ]),
      }),
    );

    global.Image = originalImage;
    window.Image = originalImage;
  });

  it('handles cancellation (no file handle selected)', async () => {
    showSaveFilePickerMock.mockResolvedValue(null);
    const consoleSpy = vi.spyOn(console, 'error');
    // We expect it to just return, no error, no alert (unless AbortError which we also catch)

    await exporter.exportToSvg(container);

    expect(fileHandleMock.createWritable).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled(); // Should handle gracefully
  });

  it('handles missing content layers gracefully', async () => {
    container.innerHTML = ''; // Empty container
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await exporter.exportToSvg(container);

    expect(consoleSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
  });
});
