import { MindMapData, MindMapNodeData } from '../../core/domain/MindMapData';
import { CryptoIdGenerator } from '../../../shared/infrastructure/CryptoIdGenerator';

export interface ExtractedImage {
  ref: string;
  base64: string;
}

export interface MigrationResult {
  migratedData: MindMapData;
  extractedImages: ExtractedImage[];
}

export class LegacyDataMigrationHelper {
  static migrateIfNeeded(data: MindMapData): MigrationResult {
    const extractedImages: ExtractedImage[] = [];
    const idGenerator = new CryptoIdGenerator();

    const processNode = (node: MindMapNodeData): MindMapNodeData => {
      const migratedNode = { ...node };

      if (migratedNode.image) {
        const base64Data = migratedNode.image;

        // Determine extension from base64 header if possible, default to png
        let ext = 'png';
        const match = base64Data.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);
        if (match && match[1]) {
          ext = match[1];
        }

        const fileName = `${idGenerator.generate()}.${ext}`;

        // Create extracted image entry
        extractedImages.push({
          ref: fileName,
          base64: base64Data,
        });

        // Set thumbnail and imageRef
        // Note: Real thumbnail generation requires Canvas API, which is not available in node.js tests easily without heavy mocks.
        // For migration at the I/O boundary, we might just use the original base64 as the thumbnail initially,
        // or the UI can regenerate thumbnails on first render. For simplicity, we just copy the base64.
        migratedNode.thumbnail = base64Data;
        migratedNode.imageRef = fileName;

        // Remove legacy property
        delete migratedNode.image;
      }

      if (migratedNode.children) {
        migratedNode.children = migratedNode.children.map(processNode);
      }

      return migratedNode;
    };

    const migratedData = {
      ...data,
      nodeData: processNode(data.nodeData),
    };

    return {
      migratedData,
      extractedImages,
    };
  }
}
