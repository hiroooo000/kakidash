/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { XMindImporter } from '../../src/infrastructure/impl/XMindImporter';
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
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock instance
    mockJSZipInstance = {
      loadAsync: vi.fn(),
      file: vi.fn(),
    };

    // Setup constructor mock to return the instance
    // IMPORTANT: Must use standard function, not arrow function, to be new-able
    (JSZip as unknown as any).mockImplementation(function () {
      return mockJSZipInstance;
    });

    importer = new XMindImporter();
    // Create dummy file
    file = new File(['dummy content'], 'mindmap.xmind', { type: 'application/octet-stream' });
  });

  it('should extract and transform valid XMind data', async () => {
    const mockContentJson = JSON.stringify([
      {
        id: 'sheet1',
        title: 'Sheet 1',
        rootTopic: {
          id: 'root1',
          title: 'Central Topic',
          children: {
            attached: [
              { id: 'sub1', title: 'Subtopic 1' },
              { id: 'sub2', title: 'Subtopic 2' },
            ],
          },
        },
      },
    ]);

    const mockFileObj = {
      async: vi.fn().mockResolvedValue(mockContentJson),
    };

    mockJSZipInstance.loadAsync.mockResolvedValue({
      file: vi.fn().mockReturnValue(mockFileObj),
    });

    const result = await importer.extractMindMapData(file);

    expect(mockJSZipInstance.loadAsync).toHaveBeenCalledWith(file);
    expect(result).toBeDefined();
    expect(result.nodeData.topic).toBe('Central Topic');
    expect(result.nodeData.root).toBe(true);
    expect(result.nodeData.children).toHaveLength(2);
    expect(result.nodeData.children![0].topic).toBe('Subtopic 1');
  });

  it('should throw error if content.json is missing', async () => {
    mockJSZipInstance.loadAsync.mockResolvedValue({
      file: vi.fn().mockReturnValue(null), // file not found
    });

    await expect(importer.extractMindMapData(file)).rejects.toThrow('Failed to import XMind file');
  });

  it('should throw error if content.json is empty or invalid JSON', async () => {
    const mockFileObj = {
      async: vi.fn().mockResolvedValue('invalid json'),
    };

    mockJSZipInstance.loadAsync.mockResolvedValue({
      file: vi.fn().mockReturnValue(mockFileObj),
    });

    await expect(importer.extractMindMapData(file)).rejects.toThrow('Failed to import XMind file');
  });
});
