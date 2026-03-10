export interface KeyBinding {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export type ShortcutAction =
  | 'navUp'
  | 'navDown'
  | 'navLeft'
  | 'navRight'
  | 'addChild'
  | 'insertParent'
  | 'addSibling'
  | 'addSiblingBefore'
  | 'deleteNode'
  | 'beginEdit' // F2, etc
  | 'copy'
  | 'paste'
  | 'cut'
  | 'undo'
  | 'redo'
  | 'bold'
  | 'italic'
  | 'increaseFontSize'
  | 'decreaseFontSize'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetZoom'
  | 'toggleFold'
  | 'centerMap'
  | 'selectColor1'
  | 'selectColor2'
  | 'selectColor3'
  | 'selectColor4'
  | 'selectColor5'
  | 'selectColor6'
  | 'selectColor7'
  | 'openCommandPalette'
  | 'increaseNodeWidth'
  | 'decreaseNodeWidth'
  | 'strikethrough';

export type ShortcutConfig = Partial<Record<ShortcutAction, KeyBinding[]>>;

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  navUp: [
    { key: 'ArrowUp' },
    { key: 'k' },
    { key: 'ArrowUp', shiftKey: true },
    { key: 'k', shiftKey: true },
  ],
  navDown: [
    { key: 'ArrowDown' },
    { key: 'j' },
    { key: 'ArrowDown', shiftKey: true },
    { key: 'j', shiftKey: true },
  ],
  navLeft: [
    { key: 'ArrowLeft' },
    { key: 'h' },
    { key: 'ArrowLeft', shiftKey: true },
    { key: 'h', shiftKey: true },
  ],
  navRight: [
    { key: 'ArrowRight' },
    { key: 'l' },
    { key: 'ArrowRight', shiftKey: true },
    { key: 'l', shiftKey: true },
  ],
  addChild: [{ key: 'Tab' }, { key: 'a' }],
  insertParent: [
    { key: 'Tab', shiftKey: true },
    { key: 'a', shiftKey: true },
  ],
  addSibling: [{ key: 'Enter' }],
  addSiblingBefore: [{ key: 'Enter', shiftKey: true }],
  deleteNode: [{ key: 'Delete' }, { key: 'Backspace' }, { key: 'd' }],
  beginEdit: [{ key: 'i' }, { key: ' ' }, { key: 'F2' }],
  copy: [
    { key: 'c', ctrlKey: true },
    { key: 'c', metaKey: true },
  ],
  paste: [
    { key: 'v', ctrlKey: true },
    { key: 'v', metaKey: true },
  ],
  cut: [
    { key: 'x', ctrlKey: true },
    { key: 'x', metaKey: true },
  ],
  undo: [
    { key: 'z', ctrlKey: true },
    { key: 'z', metaKey: true },
  ],
  redo: [
    { key: 'Z', ctrlKey: true, shiftKey: true },
    { key: 'Z', metaKey: true, shiftKey: true },
    { key: 'y', ctrlKey: true },
    { key: 'y', metaKey: true },
  ],
  bold: [{ key: 'b', shiftKey: true }], // Changed to just 'b' in previous task, keeping it? Or should it be Ctrl+b? Previous code was just 'b'
  italic: [{ key: 'i', shiftKey: true }], // Previous code was just 'i'
  strikethrough: [{ key: 'x', shiftKey: true }],
  increaseFontSize: [{ key: '>', shiftKey: true }, { key: '.' }], // > is Shift+.
  decreaseFontSize: [{ key: '<', shiftKey: true }, { key: ',' }], // < is Shift+,
  zoomIn: [{ key: '[' }], // Canvas Zoom In
  zoomOut: [{ key: ']' }], // Canvas Zoom Out
  resetZoom: [{ key: ':' }],
  toggleFold: [{ key: 'f', ctrlKey: false, metaKey: false, altKey: false }],
  selectColor1: [{ key: '1' }],
  selectColor2: [{ key: '2' }],
  selectColor3: [{ key: '3' }],
  selectColor4: [{ key: '4' }],
  selectColor5: [{ key: '5' }],
  selectColor6: [{ key: '6' }],
  selectColor7: [{ key: '7' }],
  openCommandPalette: [{ key: 'm' }],
  increaseNodeWidth: [{ key: 'ArrowRight', shiftKey: true, altKey: true }],
  decreaseNodeWidth: [{ key: 'ArrowLeft', shiftKey: true, altKey: true }],
};
