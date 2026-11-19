import type { NodeStyle } from './Node';

/**
 * Serialized representation of a single node in a Kakidash mind map JSON document.
 */
export interface MindMapNodeData {
  /** Unique identifier of the node within the mind map tree. */
  id: string;
  /** Display text of the node. Empty string for image-only nodes. */
  topic: string;
  /** Inline CSS-like text and color styling applied to this node. */
  style?: NodeStyle;
  /** Child nodes in display order. Omitted on export when empty. */
  children?: MindMapNodeData[];
  /** Indicates whether this node is the root node of the mind map. */
  root?: boolean;
  /** Whether child nodes are currently collapsed (folded). Defaults to `false`. */
  isFolded?: boolean;
  /**
   * Parent node ID.
   * @remarks Not emitted by `exportData()` and ignored by `importData()`; parent-child
   * relationships are reconstructed from the nested `children` tree.
   */
  parentId?: string;
  /** Lightweight thumbnail image encoded as a Base64 Data URL (hybrid image storage). */
  thumbnail?: string;
  /**
   * Reference identifier or filename pointing to the original high-resolution image
   * in external storage (`ImageStore` / sidecar folder).
   */
  imageRef?: string;
  /**
   * Embedded full-resolution Base64 Data URL image.
   * @deprecated Since v0.4.0. Use `thumbnail` and `imageRef` instead.
   * Automatically migrated on `loadData()`.
   */
  image?: string;
  /** Natural or target display dimensions of the image in pixels. */
  imageSize?: { width: number; height: number };
  /** Preferred side relative to the root node when layout mode is `'Both'`. */
  layoutSide?: 'left' | 'right';
  /** Built-in SVG icon ID (e.g., `'check'`, `'num_1_blue'`) or fallback text/emoji string. */
  icon?: string;
  /** Custom maximum node width in pixels, overriding the global `maxNodeWidth` option. */
  customWidth?: number;
}

/**
 * Supported visual theme identifiers for a Kakidash mind map.
 */
export type Theme = 'default' | 'simple' | 'colorful' | 'dark' | 'custom';

/**
 * Top-level serialized JSON structure for a Kakidash mind map (`getData()` / `loadData()`).
 */
export interface MindMapData {
  /** Root node of the mind map tree. */
  nodeData: MindMapNodeData;
  /**
   * Reserved field for future link/relationship data.
   * @remarks Currently unused by `exportData()` and `importData()`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkData?: any;
  /** Theme applied to the mind map. Defaults to `'default'`. */
  theme?: Theme;
  /**
   * Reserved numeric direction field (set to `1` by `XMindImporter`).
   * @remarks Currently not emitted by `exportData()` and ignored by `importData()`.
   */
  direction?: number;
  /**
   * Primary selected node ID. Emitted by `MindMapController.getData()` and used as
   * a fallback when `selectedIds` is absent or empty.
   */
  selectedId?: string;
  /**
   * List of currently selected node IDs (multi-selection).
   * Takes precedence over `selectedId` on load.
   */
  selectedIds?: string[];
}
