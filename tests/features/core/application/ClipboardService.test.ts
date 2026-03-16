import { describe, it, expect, beforeEach } from 'vitest';
import { Node } from '../../../../src/features/core/domain/Node';
import { MindMap } from '../../../../src/features/core/domain/MindMap';
import { ClipboardService } from '../../../../src/features/core/application/ClipboardService';
import { CryptoIdGenerator } from '../../../../src/shared/infrastructure/CryptoIdGenerator';

describe('ClipboardService', () => {
  let mindMap: MindMap;
  let service: ClipboardService;
  let idGen: CryptoIdGenerator;

  beforeEach(() => {
    const root = new Node('root', 'Root');
    mindMap = new MindMap(root);
    idGen = new CryptoIdGenerator();
    service = new ClipboardService(mindMap, idGen);
  });

  it('should copy and retrieve nodes', () => {
    const child = new Node('child-1', 'Child');
    mindMap.root.addChild(child);
    mindMap.registerNode(child);

    service.copyNodes(['child-1']);
    const clipboard = service.getClipboardNodes();
    expect(clipboard).toHaveLength(1);
    expect(clipboard[0].topic).toBe('Child');
    expect(clipboard[0].id).toBe('child-1'); // Actually, might be cloned differently
  });

  it('should generate new pasted nodes without modifying the tree directly', () => {
    const child = new Node('child-1', 'Child');
    mindMap.root.addChild(child);
    mindMap.registerNode(child);

    service.copyNodes(['child-1']);
    const newNodes = service.createPastedNodes('root');

    expect(newNodes).toHaveLength(1);
    expect(newNodes[0].id).not.toBe('child-1');
    expect(newNodes[0].topic).toBe('Child');
  });

  describe('Handling external clipboard text', () => {
    it('should create a new node when internal clipboard is empty and systemClipboardText is provided', () => {
      // Internal clipboard is initially empty
      const newNodes = service.createPastedNodes('root', 'External text');

      expect(newNodes).toHaveLength(1);
      expect(newNodes[0].topic).toBe('External text');
      expect(newNodes[0].parentId).toBeNull(); // Will be set when added to tree
    });

    it('should create a new node when systemClipboardText differs from internal clipboard topics', () => {
      const child = new Node('child-1', 'Internal Child');
      mindMap.root.addChild(child);
      mindMap.registerNode(child);

      service.copyNodes(['child-1']);

      // Paste with different text
      const newNodes = service.createPastedNodes('root', 'External text');

      expect(newNodes).toHaveLength(1);
      expect(newNodes[0].topic).toBe('External text');
    });

    it('should use internal clipboard when systemClipboardText matches internal clipboard topics', () => {
      const child = new Node('child-1', 'Internal Child');
      mindMap.root.addChild(child);
      mindMap.registerNode(child);

      service.copyNodes(['child-1']);

      // Paste with matching text
      const newNodes = service.createPastedNodes('root', 'Internal Child');

      expect(newNodes).toHaveLength(1);
      expect(newNodes[0].topic).toBe('Internal Child');
      expect(newNodes[0].id).not.toBe('child-1'); // It should still be a clone
    });

    it('should use internal clipboard when systemClipboardText matches multiple internal clipboard topics joined by newline', () => {
      const child1 = new Node('c1', 'Topic 1');
      const child2 = new Node('c2', 'Topic 2');
      mindMap.root.addChild(child1);
      mindMap.root.addChild(child2);
      mindMap.registerNode(child1);
      mindMap.registerNode(child2);

      service.copyNodes(['c1', 'c2']);

      const systemText = 'Topic 1\nTopic 2';
      const newNodes = service.createPastedNodes('root', systemText);

      expect(newNodes).toHaveLength(2);
      expect(newNodes[0].topic).toBe('Topic 1');
      expect(newNodes[1].topic).toBe('Topic 2');
    });
  });
});
