import JSZip from 'jszip';
import { MindMapData, MindMapNodeData } from '../../domain/interfaces/MindMapData';
import { CryptoIdGenerator } from './CryptoIdGenerator';

// XMind JSON Interfaces (Partial, focusing on what we need)
interface XMindContent {
  id: string;
  title: string;
  rootTopic: XMindTopic;
}

interface XMindTopic {
  id: string;
  title: string;
  children?: {
    attached?: XMindTopic[];
    detached?: XMindTopic[];
  };
  notes?: {
    plain: {
      content: string;
    };
  };
  // We might capture markers/labels later if needed
}

export class XMindImporter {
  private idGenerator: CryptoIdGenerator;

  constructor() {
    this.idGenerator = new CryptoIdGenerator();
  }

  public async extractMindMapData(file: File): Promise<MindMapData> {
    const zip = new JSZip();
    try {
      const contents = await zip.loadAsync(file);
      const contentFile = contents.file('content.json');

      if (!contentFile) {
        throw new Error('Invalid XMind file: content.json not found');
      }

      const jsonStr = await contentFile.async('text');
      const xmindData = JSON.parse(jsonStr) as XMindContent[];

      if (!Array.isArray(xmindData) || xmindData.length === 0) {
        throw new Error('Invalid XMind file: No content found');
      }

      // XMind files can contain multiple sheets. We'll take the first one for now.
      const primarySheet = xmindData[0];

      const mindMapData: MindMapData = {
        nodeData: this.transformTopic(primarySheet.rootTopic, true),
        theme: 'default', // XMind themes are complex, we'll default to 'default'
        direction: 1, // Default direction
      };

      return mindMapData;
    } catch (e) {
      console.error('Failed to parse XMind file', e);
      // @ts-expect-error Error cause is not supported in target lib but useful for debugging
      throw new Error('Failed to import XMind file', { cause: e });
    }
  }

  private transformTopic(topic: XMindTopic, isRoot: boolean = false): MindMapNodeData {
    // We generate new IDs to avoid conflicts with existing IDs or if XMind IDs are not UUIDs
    // However, keeping stable IDs might be better for re-import?
    // For now, let's generate new IDs to be safe and consistent with our app's ID generation.
    // Or we can use the XMind ID if it's compatible. XMind IDs are usually short strings.
    // Let's generate new UUIDs to ensure uniqueness in our system.

    const newNode: MindMapNodeData = {
      id: this.idGenerator.generate(),
      topic: topic.title || '',
      root: isRoot,
      children: [],
    };

    if (topic.children && topic.children.attached) {
      newNode.children = topic.children.attached.map((child) => this.transformTopic(child, false));
    }

    // We could map notes here if our MindMapNodeData supported them (it doesn't seem to explicitly yet based on interface, or maybe I missed it)
    // Checking MindMapNodeData definition: it has style, icon, image, folded, etc. No explicit 'notes'.
    // So we'll skip notes for now.

    return newNode;
  }
}
