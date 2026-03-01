import { describe, it, expect, beforeEach } from 'vitest';
import { NavigationService } from '../../../src/presentation/logic/NavigationService';
import { MindMap } from '../../../src/features/core/domain/MindMap';
import { Node } from '../../../src/features/core/domain/Node';

describe('NavigationService', () => {
  let mindMap: MindMap;
  let service: NavigationService;

  function buildTree(): { root: Node; c1: Node; c2: Node; gc1: Node } {
    const root = mindMap.root;
    const c1 = new Node('c1', 'Child 1');
    const c2 = new Node('c2', 'Child 2');
    const gc1 = new Node('gc1', 'Grandchild 1');
    root.addChild(c1);
    mindMap.registerNode(c1);
    root.addChild(c2);
    mindMap.registerNode(c2);
    c1.addChild(gc1);
    mindMap.registerNode(gc1);
    return { root, c1, c2, gc1 };
  }

  beforeEach(() => {
    const root = new Node('root', 'Root', null, true);
    mindMap = new MindMap(root);
    service = new NavigationService(mindMap);
  });

  describe('navigate (Right layout)', () => {
    beforeEach(() => {
      service.setLayoutMode('Right');
    });

    it('should navigate Right from root to first child', () => {
      const { root, c1 } = buildTree();
      const targetId = service.navigate(root.id, 'Right');
      expect(targetId).toBe(c1.id);
    });

    it('should navigate Left from child to parent', () => {
      const { c1, root } = buildTree();
      const targetId = service.navigate(c1.id, 'Left');
      expect(targetId).toBe(root.id);
    });

    it('should navigate Down between siblings', () => {
      const { c1, c2 } = buildTree();
      const targetId = service.navigate(c1.id, 'Down');
      expect(targetId).toBe(c2.id);
    });

    it('should navigate Up between siblings', () => {
      const { c1, c2 } = buildTree();
      const targetId = service.navigate(c2.id, 'Up');
      expect(targetId).toBe(c1.id);
    });

    it('should return undefined when navigating Up from first sibling', () => {
      const { c1 } = buildTree();
      const targetId = service.navigate(c1.id, 'Up');
      expect(targetId).toBeUndefined();
    });

    it('should return undefined when navigating Down from last sibling', () => {
      const { c2 } = buildTree();
      const targetId = service.navigate(c2.id, 'Down');
      expect(targetId).toBeUndefined();
    });

    it('should navigate Right from child to grandchild', () => {
      const { c1, gc1 } = buildTree();
      const targetId = service.navigate(c1.id, 'Right');
      expect(targetId).toBe(gc1.id);
    });

    it('should return undefined for nonexistent node', () => {
      buildTree();
      const targetId = service.navigate('nonexistent', 'Right');
      expect(targetId).toBeUndefined();
    });
  });

  describe('navigate (Left layout)', () => {
    beforeEach(() => {
      service.setLayoutMode('Left');
    });

    it('should navigate Left from root to first child', () => {
      const { root, c1 } = buildTree();
      const targetId = service.navigate(root.id, 'Left');
      expect(targetId).toBe(c1.id);
    });

    it('should navigate Right from child to parent', () => {
      const { c1, root } = buildTree();
      const targetId = service.navigate(c1.id, 'Right');
      expect(targetId).toBe(root.id);
    });
  });

  describe('getNodeDirection', () => {
    it('should return right for Right layout', () => {
      const { c1 } = buildTree();
      service.setLayoutMode('Right');
      expect(service.getNodeDirection(c1)).toBe('right');
    });

    it('should return left for Left layout', () => {
      const { c1 } = buildTree();
      service.setLayoutMode('Left');
      expect(service.getNodeDirection(c1)).toBe('left');
    });

    it('should return right for root node', () => {
      const { root } = buildTree();
      service.setLayoutMode('Both');
      expect(service.getNodeDirection(root)).toBe('right');
    });
  });

  describe('ensureExplicitLayoutSides', () => {
    it('should assign layout sides to children without one in Both mode', () => {
      service.setLayoutMode('Both');
      const { root, c1, c2 } = buildTree();
      service.ensureExplicitLayoutSides(root);
      // Index 0 -> right, Index 1 -> left
      expect(c1.presentation.layoutSide).toBe('right');
      expect(c2.presentation.layoutSide).toBe('left');
    });

    it('should not change existing layout sides', () => {
      service.setLayoutMode('Both');
      const { root, c1 } = buildTree();
      c1.presentation.layoutSide = 'left';
      service.ensureExplicitLayoutSides(root);
      expect(c1.presentation.layoutSide).toBe('left');
    });

    it('should do nothing if layout mode is not Both', () => {
      service.setLayoutMode('Right');
      const { root, c1 } = buildTree();
      service.ensureExplicitLayoutSides(root);
      expect(c1.presentation.layoutSide).toBeUndefined();
    });
  });
});
