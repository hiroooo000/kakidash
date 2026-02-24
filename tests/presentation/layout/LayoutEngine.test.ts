import { describe, it, expect, vi } from 'vitest';
import { LayoutEngine } from '../../../src/presentation/layout/LayoutEngine';
import { Node } from '../../../src/features/core/domain/Node';

describe('LayoutEngine', () => {
  it('should calculate layout for root node correctly', () => {
    const measureFn = vi.fn().mockImplementation((_node) => ({ width: 100, height: 40 }));
    const engine = new LayoutEngine(measureFn);

    const root = new Node('root-1', 'Root', null, true);

    const result = engine.calculate(root, 'Right');

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toEqual(
      expect.objectContaining({
        nodeId: 'root-1',
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        isRoot: true,
      }),
    );
  });
});
