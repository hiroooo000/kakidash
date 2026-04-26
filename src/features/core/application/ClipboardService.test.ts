import { describe, it, expect, beforeEach } from 'vitest';
import { ClipboardService } from './ClipboardService';
import { MindMap } from '../domain/MindMap';
import { Node } from '../domain/Node';
import { IdGenerator } from '../../../shared/kernel/IdGenerator';

class MockIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    return `mock-id-${++this.counter}`;
  }
}

describe('ClipboardService', () => {
  let mindMap: MindMap;
  let idGenerator: IdGenerator;
  let clipboardService: ClipboardService;

  beforeEach(() => {
    const root = new Node('root', 'Root');
    mindMap = new MindMap(root);
    idGenerator = new MockIdGenerator();
    clipboardService = new ClipboardService(mindMap, idGenerator);
  });

  it('should copy and paste a node with thumbnail and imageRef', () => {
    const node1 = new Node('node1', 'Topic', 'root');
    node1.thumbnail = 'base64thumbnail';
    node1.imageRef = 'img_123.png';
    mindMap.root.addChild(node1);
    mindMap.registerNode(node1);

    clipboardService.copyNodes(['node1']);
    const pastedNodes = clipboardService.createPastedNodes('root');

    expect(pastedNodes.length).toBe(1);
    expect(pastedNodes[0].id).toBe('mock-id-1');
    expect(pastedNodes[0].thumbnail).toBe('base64thumbnail');
    expect(pastedNodes[0].imageRef).toBe('img_123.png');
  });
});
