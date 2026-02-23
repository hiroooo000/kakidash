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
});
