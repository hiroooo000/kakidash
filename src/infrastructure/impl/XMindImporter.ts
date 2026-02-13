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
  image?: {
    src: string;
  };
  notes?: {
    plain: {
      content: string;
    };
  };
}

export class XMindImporter {
  private idGenerator: CryptoIdGenerator;

  constructor() {
    this.idGenerator = new CryptoIdGenerator();
  }

  public async extractMindMapData(
    data: ArrayBuffer | Blob | Uint8Array | string,
  ): Promise<MindMapData> {
    const zip = new JSZip();
    try {
      const contents = await zip.loadAsync(data);
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

      const rootNode = await this.transformTopic(primarySheet.rootTopic, zip, true);

      const mindMapData: MindMapData = {
        nodeData: rootNode,
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

  private async transformTopic(
    topic: XMindTopic,
    zip: JSZip,
    isRoot: boolean = false,
  ): Promise<MindMapNodeData> {
    const nodeId = this.idGenerator.generate();
    const children: MindMapNodeData[] = [];

    // Process Original Children First (Recursively)
    if (topic.children && topic.children.attached) {
      for (const child of topic.children.attached) {
        children.push(await this.transformTopic(child, zip, false));
      }
    }

    // Handle Image
    let imageData: string | undefined = undefined;
    if (topic.image && topic.image.src && topic.image.src.startsWith('xap:')) {
      const path = topic.image.src.substring(4); // remove 'xap:'
      // Some paths might start with /, XMind is inconsistent sometimes? usually xap:resources/foo.png
      // zip.file() handles relative paths.
      const file = zip.file(path);
      if (file) {
        const base64 = await file.async('base64');
        const ext = path.split('.').pop()?.toLowerCase();
        let mime = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
        else if (ext === 'svg') mime = 'image/svg+xml';
        else if (ext === 'gif') mime = 'image/gif';

        imageData = `data:${mime};base64,${base64}`;
      }
    }

    // Case 1: Text + Image -> Text Node (Parent) + Image Node (Child)
    if (topic.title && imageData) {
      const textNode: MindMapNodeData = {
        id: nodeId,
        topic: topic.title,
        root: isRoot,
        children: children, // Original children attach to text node
      };

      const imageNodeId = this.idGenerator.generate();
      const imageNode: MindMapNodeData = {
        id: imageNodeId,
        topic: '',
        image: imageData,
        children: [],
      };

      // Add image node as a child of the text node
      // User requested "add the image node as a child of that text node"
      textNode.children?.push(imageNode);

      return textNode;
    }
    // Case 2: Image Only -> Image Node
    else if (imageData) {
      return {
        id: nodeId,
        topic: '', // Empty topic for image node
        image: imageData,
        root: isRoot,
        children: children,
      };
    }
    // Case 3: Text Only (or Empty) -> Text Node
    else {
      return {
        id: nodeId,
        topic: topic.title || '',
        root: isRoot,
        children: children,
      };
    }
  }
}
