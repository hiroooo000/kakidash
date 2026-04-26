import { describe, it, expect } from 'vitest';
import { LegacyDataMigrationHelper } from './LegacyDataMigrationHelper';
import { MindMapData } from '../../core/domain/MindMapData';

describe('LegacyDataMigrationHelper', () => {
  it('should not modify data if it has no legacy image properties', () => {
    const data: MindMapData = {
      nodeData: {
        id: 'root',
        topic: 'Root',
        children: [
          {
            id: 'child1',
            topic: 'Child 1',
            thumbnail: 'base64thumbnail',
            imageRef: 'images/child1.png',
          },
        ],
      },
    };

    const result = LegacyDataMigrationHelper.migrateIfNeeded(data);
    expect(result.migratedData).toEqual(data);
    expect(result.extractedImages).toHaveLength(0);
  });

  it('should migrate legacy image to thumbnail and imageRef', () => {
    const data: MindMapData = {
      nodeData: {
        id: 'root',
        topic: 'Root',
        image: 'data:image/png;base64,rootImage', // Legacy format
        children: [
          {
            id: 'child1',
            topic: 'Child 1',
            image: 'data:image/jpeg;base64,child1Image', // Legacy format
          },
        ],
      },
    };

    const result = LegacyDataMigrationHelper.migrateIfNeeded(data);

    // Should have extracted 2 images
    expect(result.extractedImages).toHaveLength(2);

    // Root node migration check
    const rootNode = result.migratedData.nodeData;
    expect(rootNode.image).toBeUndefined();
    expect(rootNode.thumbnail).toBe('data:image/png;base64,rootImage'); // Falls back to full base64 if no resizing implemented here
    expect(rootNode.imageRef).toMatch(/^[\w-]+\.png$/);

    // Check extracted images list
    const rootExtracted = result.extractedImages.find((img) => img.ref === rootNode.imageRef);
    expect(rootExtracted).toBeDefined();
    expect(rootExtracted?.base64).toBe('data:image/png;base64,rootImage');

    // Child node migration check
    const childNode = rootNode.children![0];
    expect(childNode.image).toBeUndefined();
    expect(childNode.thumbnail).toBe('data:image/jpeg;base64,child1Image');
    expect(childNode.imageRef).toMatch(/^[\w-]+\.jpeg$/);

    const childExtracted = result.extractedImages.find((img) => img.ref === childNode.imageRef);
    expect(childExtracted).toBeDefined();
    expect(childExtracted?.base64).toBe('data:image/jpeg;base64,child1Image');
  });
});
