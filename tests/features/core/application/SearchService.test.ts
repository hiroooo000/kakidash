import { describe, it, expect, beforeEach } from 'vitest';
import { Node } from '../../../../src/features/core/domain/Node';
import { MindMap } from '../../../../src/features/core/domain/MindMap';
import { SearchService } from '../../../../src/features/core/application/SearchService';

describe('SearchService', () => {
  let mindMap: MindMap;
  let service: SearchService;

  beforeEach(() => {
    const root = new Node('root', 'Root');
    mindMap = new MindMap(root);
    service = new SearchService(mindMap);
  });

  it('should search node by topic', () => {
    const child1 = new Node('c1', 'Alpha');
    const child2 = new Node('c2', 'Beta');
    mindMap.root.addChild(child1);
    mindMap.root.addChild(child2);

    const res1 = service.searchNodes('Al');
    expect(res1).toHaveLength(1);
    expect(res1[0].topic).toBe('Alpha');

    const res2 = service.searchNodes('unknown');
    expect(res2).toHaveLength(0);
  });
});
