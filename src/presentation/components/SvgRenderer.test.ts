import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SvgRenderer } from './SvgRenderer';
import { MindMap } from '../../features/core/domain/MindMap';
import { Node } from '../../features/core/domain/Node';

describe('SvgRenderer Cache', () => {
  let renderer: SvgRenderer;
  let container: HTMLElement;
  let mindMap: MindMap;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = new SvgRenderer(container);
    mindMap = new MindMap(new Node('root', 'Root'));
  });

  it('should cache measureNode results', () => {
    const node = new Node('test-node', 'Test');

    // First call should perform measurement
    const spy = vi.spyOn(document, 'createElement');
    const result1 = renderer.measureNode(node, mindMap);
    const callCount1 = spy.mock.calls.filter((call) => call[0] === 'div').length;

    // Second call should return cached result
    const result2 = renderer.measureNode(node, mindMap);
    const callCount2 = spy.mock.calls.filter((call) => call[0] === 'div').length;

    expect(result1).toEqual(result2);
    // If cached, callCount2 should be the same as callCount1 (no new div created for measurement)
    // Note: measureNode internally creates 1 div and potentially more for icons.
    expect(callCount2).toBe(callCount1);
  });

  it('should clear cache on render()', () => {
    const node = new Node('test-node', 'Test');
    mindMap.root.addChild(node);

    renderer.measureNode(node, mindMap);
    const spy = vi.spyOn(document, 'createElement');
    const initialDivCalls = spy.mock.calls.filter((call) => call[0] === 'div').length;

    // render() should clear cache
    renderer.render(mindMap);

    // This call should perform measurement again
    renderer.measureNode(node, mindMap);
    const afterRenderDivCalls = spy.mock.calls.filter((call) => call[0] === 'div').length;

    expect(afterRenderDivCalls).toBeGreaterThan(initialDivCalls);
  });

  it('should cache different nodes separately', () => {
    const node1 = new Node('node1', 'Node 1');
    const node2 = new Node('node2', 'Node 2');

    const spy = vi.spyOn(document, 'createElement');

    renderer.measureNode(node1, mindMap);
    const callsAfterNode1 = spy.mock.calls.filter((call) => call[0] === 'div').length;

    renderer.measureNode(node2, mindMap);
    const callsAfterNode2 = spy.mock.calls.filter((call) => call[0] === 'div').length;

    expect(callsAfterNode2).toBeGreaterThan(callsAfterNode1);
  });
});
