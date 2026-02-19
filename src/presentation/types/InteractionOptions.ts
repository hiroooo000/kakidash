import { ShortcutConfig } from '../../features/core/domain/ShortcutConfig';
import { StyleAction } from '../../features/theme/domain/StyleAction';

export type Direction = 'Up' | 'Down' | 'Left' | 'Right';

export interface InteractionOptions {
  onNodeClick: (nodeId: string, shiftKey?: boolean) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (nodeId: string, position: 'before' | 'after') => void;
  onInsertParent?: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDropNode: (
    draggedId: string,
    targetId: string,
    position: 'top' | 'bottom' | 'left' | 'right',
  ) => void;
  onUpdateNode?: (nodeId: string, topic: string) => void;
  onNavigate?: (nodeId: string, direction: Direction, extendSelection?: boolean) => void;
  onPan?: (dx: number, dy: number) => void;
  onCopyNode?: (nodeId: string) => void;
  onPasteNode?: (parentId: string) => void;
  onCutNode?: (nodeId: string) => void;
  onPasteImage?: (parentId: string, imageData: string, width: number, height: number) => void;
  onZoom?: (delta: number, x: number, y: number) => void;
  onZoomReset?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onStyleAction?: (nodeId: string, action: StyleAction) => void;
  onEditEnd?: (nodeId: string) => void;
  onToggleFold?: (nodeId: string) => void;
  onToggleCommandPalette?: () => void;
  onUpdateNodeWidth?: (nodeId: string, increment: number) => void;
  shortcuts?: ShortcutConfig;
  allowReadOnly?: boolean;
}
