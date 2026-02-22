// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { Kakidash } from '../../src/index';

describe('Kakidash Public API Contract', () => {
  const container = document.createElement('div');
  const board = new Kakidash(container);

  const expectedMethods = [
    // EventEmitter (Inherited)
    'on',
    'off',
    'addListener',
    'removeListener',

    // Core Data API
    'addNode',
    'addSibling',
    'insertParent',
    'deleteNode',
    'updateNode',

    // History
    'undo',
    'redo',

    // UI/Interaction state
    'toggleFold',
    'toggleCommandPalette',
    'registerCommand',
    'openCommandPalette',

    // Accessors & Search
    'searchNodes',
    'getSelectedNodeId',
    'updateNodeStyle',
    'setTheme',
    'getMindMap',
    'getNode',
    'getRoot',
    'findNodes',
    'getRootId',
    'getData',

    // Config & Lifecycle
    'setMaxNodeWidth',
    'getMaxNodeWidth',
    'updateGlobalStyles',
    'setReadOnly',
    'destroy',
    'batch',

    // Composite Interaction API
    'addChildNode',
    'addSiblingNode',
    'insertParentNode',
    'removeNode',
    'moveNode',
    'updateNodeTopic',
    'selectNode',
    'panBoard',
    'zoomBoard',
    'resetZoom',
    'copyNode',
    'pasteNode',
    'pasteImage',
    'cutNode',
    'updateLayout',
    'setLayoutMode',
    'getLayoutMode',
    'navigateNode',
    'loadData',
  ];

  it('should have all expected public methods', () => {
    expectedMethods.forEach((methodName) => {
      expect(
        board[methodName as keyof Kakidash],
        `Method ${methodName} should be defined`,
      ).toBeDefined();
      expect(
        typeof board[methodName as keyof Kakidash],
        `Method ${methodName} should be a function`,
      ).toBe('function');
    });
  });

  it('should be able to subscribe to events using on()', () => {
    // This is the direct regression test for the reported issue
    expect(() => {
      board.on('model:change', () => {});
    }).not.toThrow();
  });
});
