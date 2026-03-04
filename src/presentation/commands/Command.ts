import { StyleAction } from '../../features/theme/domain/StyleAction';

export type Direction = 'Up' | 'Down' | 'Left' | 'Right';

export type Command =
  | { type: 'addNode'; parentId: string }
  | { type: 'addSibling'; nodeId: string; position: 'before' | 'after' }
  | { type: 'deleteNode'; nodeId: string }
  | { type: 'insertParent'; nodeId: string }
  | {
      type: 'dropNode';
      draggedId: string;
      targetId: string;
      position: 'top' | 'bottom' | 'left' | 'right';
    }
  | { type: 'updateNode'; nodeId: string; topic: string }
  | { type: 'navigate'; nodeId: string | null; direction: Direction; extendSelection?: boolean }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'copyNode'; nodeId: string }
  | { type: 'pasteNode'; parentId: string }
  | { type: 'cutNode'; nodeId: string }
  | {
      type: 'pasteImage';
      parentId: string;
      imageData: string;
      width: number;
      height: number;
    }
  | { type: 'zoom'; delta: number; x: number; y: number }
  | { type: 'zoomReset' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'styleAction'; nodeId: string; action: StyleAction }
  | { type: 'editNode'; nodeId: string }
  | { type: 'editEnd'; nodeId: string }
  | { type: 'toggleFold'; nodeId: string }
  | { type: 'toggleCommandPalette' }
  | { type: 'updateNodeWidth'; nodeId: string; increment: number }
  | { type: 'selectNode'; nodeId: string | null; extendSelection?: boolean };
