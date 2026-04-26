export interface MindMapNodeData {
  id: string;
  topic: string;
  style?: {
    fontSize?: string;
    color?: string;
    background?: string;
    fontWeight?: string;
  };
  children?: MindMapNodeData[];
  root?: boolean;
  isFolded?: boolean;
  parentId?: string;
  thumbnail?: string;
  imageRef?: string;
  image?: string; // @deprecated
  imageSize?: { width: number; height: number };
  layoutSide?: 'left' | 'right';
  icon?: string;
  customWidth?: number;
}

export type Theme = 'default' | 'simple' | 'colorful' | 'custom';

export interface MindMapData {
  nodeData: MindMapNodeData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkData?: any;
  theme?: Theme;
  direction?: number;
  selectedId?: string;
  selectedIds?: string[];
}
