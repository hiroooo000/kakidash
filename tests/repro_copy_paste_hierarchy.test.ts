import { test, expect } from 'vitest';
import { MindMapService } from '../src/features/core/application/MindMapService';
import { MindMap } from '../src/features/core/domain/MindMap';
import { Node } from '../src/features/core/domain/Node';
import { IdGenerator } from '../src/shared/kernel/IdGenerator';

class MockIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    return `id-${this.counter++}`;
  }
}

test('Copy/Paste should maintain hierarchy and not duplicate child nodes', () => {
  const idGenerator = new MockIdGenerator();
  const root = new Node('root', 'Root');
  const mindMap = new MindMap(root);
  const service = new MindMapService(mindMap, idGenerator);

  // Setup: Root -> Parent -> Child
  const parent = service.addNode('root', 'Parent');
  expect(parent).not.toBeNull();
  const child = service.addNode(parent!.id, 'Child');
  expect(child).not.toBeNull();

  // Select Parent and Child
  // User performs copy on these two nodes
  service.copyNodes([parent!.id, child!.id]);

  // Verify clipboard content (Internal state check if possible, or just paste behavior)
  // We can't easily check private clipboard, so we rely on paste behavior.

  // Paste under Root
  const pastedNodes = service.pasteNodes('root');

  // Expectations:
  // We expect only 1 node to be pasted directly under root (the copy of Parent)
  // The copy of Parent should contain the copy of Child.

  // Current Bug Behavior: It likely pastes 2 nodes (Parent and Child) under Root.
  expect(pastedNodes.length).toBe(1);
  expect(pastedNodes[0].topic).toBe('Parent');
  expect(pastedNodes[0].children.length).toBe(1);
  expect(pastedNodes[0].children[0].topic).toBe('Child');

  // Verify Root children count
  // Root started with 1 child (Parent).
  // After paste, it should have 1 + 1 = 2 children.
  expect(root.children.length).toBe(2);
});
