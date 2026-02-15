/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { XMindImporter } from '../../src/features/export_import/XMindImporter';
import JSZip from 'jszip';

// Correctly mock JSZip default export class
vi.mock('jszip', () => {
  return {
    default: vi.fn(),
  };
});

describe('XMindImporter', () => {
  let importer: XMindImporter;
  let mockJSZipInstance: any;
  let file: File;

  beforeEach(() => {
    vi.clearAllMocks();

    mockJSZipInstance = {
      loadAsync: vi.fn(),
      file: vi.fn(),
    };

    (JSZip as unknown as any).mockImplementation(function () {
      return mockJSZipInstance;
    });

    importer = new XMindImporter();
    file = new File(['dummy content'], 'mindmap.xmind', { type: 'application/octet-stream' });
  });

  const setupMockZip = (contentJson: string, imageFiles: Record<string, string> = {}) => {
    const mockContentFile = {
      async: vi.fn().mockResolvedValue(contentJson),
    };

    mockJSZipInstance.loadAsync.mockResolvedValue(mockJSZipInstance);
    mockJSZipInstance.file.mockImplementation((path: string) => {
      if (path === 'content.json') return mockContentFile;
      if (imageFiles[path]) {
        return {
          async: vi.fn().mockResolvedValue(imageFiles[path]),
        };
      }
      return null;
    });
  };

  it('should extract and transform valid XMind data (Text Only)', async () => {
    const mockContentJson = JSON.stringify([
      {
        id: 'sheet1',
        title: 'Sheet 1',
        rootTopic: {
          id: 'root1',
          title: 'Central Topic',
          children: {
            attached: [{ id: 'sub1', title: 'Subtopic 1' }],
          },
        },
      },
    ]);

    setupMockZip(mockContentJson);

    const result = await importer.extractMindMapData(file);

    expect(result.nodeData.topic).toBe('Central Topic');
    expect(result.nodeData.children).toHaveLength(1);
    expect(result.nodeData.children![0].topic).toBe('Subtopic 1');
  });

  it('should support ArrayBuffer as input', async () => {
    const mockContentJson = JSON.stringify([
      {
        id: 'sheet1',
        title: 'Sheet 1',
        rootTopic: {
          id: 'root1',
          title: 'Buffer Topic',
          children: { attached: [] },
        },
      },
    ]);

    setupMockZip(mockContentJson);
    const buffer = new ArrayBuffer(8);

    const result = await importer.extractMindMapData(buffer);

    expect(result.nodeData.topic).toBe('Buffer Topic');
    expect(mockJSZipInstance.loadAsync).toHaveBeenCalledWith(buffer);
  });

  it('should split text and image into parent-child nodes if both exist', async () => {
    const mockContentJson = JSON.stringify([
      {
        id: 'sheet1',
        title: 'Sheet 1',
        rootTopic: {
          id: 'root1',
          title: 'Text Topic',
          image: { src: 'xap:resources/image.png' },
          children: { attached: [] },
        },
      },
    ]);

    setupMockZip(mockContentJson, {
      'resources/image.png': 'base64EncodedImageString',
    });

    const result = await importer.extractMindMapData(file);

    expect(result.nodeData.topic).toBe('Text Topic');
    expect(result.nodeData.image).toBeUndefined(); // Parent should not have image property

    // Should have 1 child (the image node)
    expect(result.nodeData.children).toBeTruthy();
    expect(result.nodeData.children).toHaveLength(1);

    const imageNode = result.nodeData.children![0];
    expect(imageNode.topic).toBe('');
    expect(imageNode.image).toBe('data:image/png;base64,base64EncodedImageString');
  });

  it('should create single node if only image exists', async () => {
    const mockContentJson = JSON.stringify([
      {
        id: 'sheet1',
        title: 'Sheet 1',
        rootTopic: {
          id: 'root1',
          title: '',
          image: { src: 'xap:resources/photo.jpg' },
        },
      },
    ]);

    setupMockZip(mockContentJson, {
      'resources/photo.jpg': 'base64JpegString',
    });

    const result = await importer.extractMindMapData(file);

    expect(result.nodeData.topic).toBe('');
    expect(result.nodeData.image).toBe('data:image/jpeg;base64,base64JpegString');
    expect(result.nodeData.children).toHaveLength(0);
  });

  it('should handle nested children correctly when text+image splits', async () => {
    // If Text+Image Split happens, original children should attach to Text Node (Parent)
    const mockContentJson = JSON.stringify([
      {
        id: 'sheet1',
        title: 'Sheet 1',
        rootTopic: {
          id: 'root1',
          title: 'Parent Text',
          image: { src: 'xap:resources/img.gif' },
          children: {
            attached: [{ id: 'child1', title: 'Original Child' }],
          },
        },
      },
    ]);

    setupMockZip(mockContentJson, { 'resources/img.gif': 'gifdata' });

    const result = await importer.extractMindMapData(file);

    expect(result.nodeData.topic).toBe('Parent Text');
    // Should have 2 children: Image Node AND Original Child
    expect(result.nodeData.children).toHaveLength(2);

    const childTopics = result.nodeData.children!.map((c) => c.topic);
    expect(childTopics).toContain('Original Child');
    expect(childTopics).toContain(''); // Image node topic

    const imageNode = result.nodeData.children!.find((c) => c.image);
    expect(imageNode).toBeDefined();
    expect(imageNode!.image).toBe('data:image/gif;base64,gifdata');
  });

  it('should throw error if content.json is missing', async () => {
    // Setup mock that returns null for content.json
    mockJSZipInstance.loadAsync.mockResolvedValue(mockJSZipInstance);
    mockJSZipInstance.file.mockReturnValue(null);

    await expect(importer.extractMindMapData(file)).rejects.toThrow('Failed to import XMind file');
  });

  it('should throw error if content.json is empty or invalid JSON', async () => {
    const mockContentFile = {
      async: vi.fn().mockResolvedValue('invalid json'),
    };
    mockJSZipInstance.loadAsync.mockResolvedValue(mockJSZipInstance);
    mockJSZipInstance.file.mockReturnValue(mockContentFile);

    await expect(importer.extractMindMapData(file)).rejects.toThrow('Failed to import XMind file');
  });
});
