import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarkdownExporter } from '../../src/presentation/logic/MarkdownExporter';
import { MindMap } from '../../src/domain/entities/MindMap';
import { Node } from '../../src/domain/entities/Node';

describe('MarkdownExporter', () => {
  // Mock window.showSaveFilePicker and URL.createObjectURL/revokeObjectURL
  const mockShowSaveFilePicker = vi.fn();
  const mockCreateObjectURL = vi.fn();
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.showSaveFilePicker = mockShowSaveFilePicker;
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    // Default mock implementation for createWritable
    mockShowSaveFilePicker.mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn(),
        close: vi.fn(),
      }),
    });
  });

  const createNode = (
    id: string,
    topic: string,
    parentId: string | null = null,
    isRoot = false,
    image?: string,
  ): Node => {
    return new Node(id, topic, parentId, isRoot, image);
  };

  it('should export simple hierarchy (Root + Level 1)', async () => {
    const root = createNode('root', 'Root Topic', null, true);
    const child1 = createNode('c1', 'Child 1', 'root');
    const child2 = createNode('c2', 'Child 2', 'root');
    root.addChild(child1);
    root.addChild(child2);

    const mindMap = new MindMap(root);
    const exporter = new MarkdownExporter();

    // Spy on generateMarkdown or check the blob content passed to saveFile
    // Since generateMarkdown is private, we can verify via the write call argument if we mock fully,
    // or we can test the logic by exposing it or inferring from the Blob.
    // Here we will check the logic by ensuring the Blob content is correct.

    let exportedContent = '';
    mockShowSaveFilePicker.mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockImplementation((blob: Blob) => {
          return blob.text().then((text) => {
            exportedContent = text;
          });
        }),
        close: vi.fn(),
      }),
    });

    await exporter.export(mindMap);

    const expected = ['# Root Topic', '## Child 1', '## Child 2'].join('\n');

    expect(exportedContent).toBe(expected);
  });

  it('should export nested hierarchy (Root + Level 1 + Level 2)', async () => {
    const root = createNode('root', 'Root', null, true);
    const child1 = createNode('c1', 'Chapter 1', 'root');
    const grandChild1 = createNode('gc1', 'Section 1.1', 'c1');
    const grandChild2 = createNode('gc2', 'Section 1.2', 'c1');

    child1.addChild(grandChild1);
    child1.addChild(grandChild2);
    root.addChild(child1);

    const mindMap = new MindMap(root);
    const exporter = new MarkdownExporter();

    let exportedContent = '';
    mockShowSaveFilePicker.mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockImplementation((blob: Blob) => {
          return blob.text().then((text) => {
            exportedContent = text;
          });
        }),
        close: vi.fn(),
      }),
    });

    await exporter.export(mindMap);

    const expected = ['# Root', '## Chapter 1', '- Section 1.1', '- Section 1.2'].join('\n');

    expect(exportedContent).toBe(expected);
  });

  it('should export deeply nested hierarchy (Root + L1 + L2 + L3)', async () => {
    const root = createNode('root', 'Root', null, true);
    const l1 = createNode('l1', 'Level 1', 'root');
    const l2 = createNode('l2', 'Level 2', 'l1');
    const l3 = createNode('l3', 'Level 3', 'l2');

    l2.addChild(l3);
    l1.addChild(l2);
    root.addChild(l1);

    const mindMap = new MindMap(root);
    const exporter = new MarkdownExporter();

    let exportedContent = '';
    mockShowSaveFilePicker.mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockImplementation((blob: Blob) => {
          return blob.text().then((text) => {
            exportedContent = text;
          });
        }),
        close: vi.fn(),
      }),
    });

    await exporter.export(mindMap);

    // Level 0: #
    // Level 1: ##
    // Level 2: - (indent 0)
    // Level 3:   - (indent 2)
    const expected = ['# Root', '## Level 1', '- Level 2', '  - Level 3'].join('\n');

    expect(exportedContent).toBe(expected);
  });

  it('should replace image nodes with [image node]', async () => {
    const root = createNode('root', 'Root', null, true);
    const imageNode = createNode('img1', '', 'root', false, 'data:image/png;base64,...');
    const textNode = createNode('txt1', 'Text', 'root');

    root.addChild(imageNode);
    root.addChild(textNode);

    const mindMap = new MindMap(root);
    const exporter = new MarkdownExporter();

    let exportedContent = '';
    mockShowSaveFilePicker.mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockImplementation((blob: Blob) => {
          return blob.text().then((text) => {
            exportedContent = text;
          });
        }),
        close: vi.fn(),
      }),
    });

    await exporter.export(mindMap);

    const expected = ['# Root', '## [image node]', '## Text'].join('\n');

    expect(exportedContent).toBe(expected);
  });
});
