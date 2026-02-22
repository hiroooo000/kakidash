import { describe, it, expect } from 'vitest';
import { Node } from '@/features/core/domain/Node';
import { MindMap } from '@/features/core/domain/MindMap';

describe('Node Entity', () => {
  it('should create a node with correct properties', () => {
    const node = new Node('1', 'Root Node', null, true);
    expect(node.id).toBe('1');
    expect(node.topic).toBe('Root Node');
    expect(node.parentId).toBeNull();
    expect(node.isRoot).toBe(true);
    expect(node.children).toEqual([]);
    expect(node.presentation.isFolded).toBe(false);
  });

  it('should add a child node', () => {
    const parent = new Node('1', 'Parent');
    const child = new Node('2', 'Child');
    parent.addChild(child);

    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]).toBe(child);
    expect(child.parentId).toBe('1');
  });

  it('should remove a child node', () => {
    const parent = new Node('1', 'Parent');
    const child = new Node('2', 'Child');
    parent.addChild(child);
    parent.removeChild('2');

    expect(parent.children).toHaveLength(0);
  });
});

describe('MindMap Entity', () => {
  it('should find a node by ID', () => {
    const root = new Node('1', 'Root');
    const child1 = new Node('2', 'Child 1');
    const child2 = new Node('3', 'Child 2');
    const grandChild = new Node('4', 'GrandChild');

    root.addChild(child1);
    root.addChild(child2);
    child1.addChild(grandChild);

    const mindMap = new MindMap(root);

    expect(mindMap.findNode('1')).toBe(root);
    expect(mindMap.findNode('2')).toBe(child1);
    expect(mindMap.findNode('4')).toBe(grandChild);
    expect(mindMap.findNode('999')).toBeNull();
  });

  it('should find nodes via index in O(1) after construction', () => {
    const root = new Node('root', 'Root');
    const child = new Node('child-1', 'Child');
    root.addChild(child);
    const mindMap = new MindMap(root);

    // findNode should work without recursive traversal (index-based)
    expect(mindMap.findNode('root')).toBe(root);
    expect(mindMap.findNode('child-1')).toBe(child);
  });

  it('should rebuild index after root replacement', () => {
    const root1 = new Node('r1', 'Root 1');
    const mindMap = new MindMap(root1);
    expect(mindMap.findNode('r1')).toBe(root1);

    // Simulate root replacement (like importData)
    const root2 = new Node('r2', 'Root 2');
    const child = new Node('c1', 'Child');
    root2.addChild(child);
    mindMap.root = root2;
    mindMap.rebuildIndex();

    expect(mindMap.findNode('r2')).toBe(root2);
    expect(mindMap.findNode('c1')).toBe(child);
    expect(mindMap.findNode('r1')).toBeNull(); // Old root no longer indexed
  });

  it('should register a new node and its subtree', () => {
    const root = new Node('root', 'Root');
    const mindMap = new MindMap(root);

    const newNode = new Node('new-1', 'New');
    const newChild = new Node('new-2', 'New Child');
    newNode.addChild(newChild);

    root.addChild(newNode);
    mindMap.registerNode(newNode);

    expect(mindMap.findNode('new-1')).toBe(newNode);
    expect(mindMap.findNode('new-2')).toBe(newChild);
  });

  it('should unregister a node and its subtree', () => {
    const root = new Node('root', 'Root');
    const child = new Node('child', 'Child');
    const grandChild = new Node('gc', 'GrandChild');
    child.addChild(grandChild);
    root.addChild(child);

    const mindMap = new MindMap(root);
    expect(mindMap.findNode('child')).toBe(child);
    expect(mindMap.findNode('gc')).toBe(grandChild);

    root.removeChild('child');
    mindMap.unregisterNode(child);

    expect(mindMap.findNode('child')).toBeNull();
    expect(mindMap.findNode('gc')).toBeNull();
    expect(mindMap.findNode('root')).toBe(root); // Root still indexed
  });
});
