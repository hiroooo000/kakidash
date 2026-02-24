import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SvgRenderer } from './SvgRenderer';
import { MindMap } from '../../features/core/domain/MindMap';
import { Node } from '../../features/core/domain/Node';
import { LayoutEngine } from '../layout/LayoutEngine';

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
    // render() equivalent with LayoutEngine
    const engine = new LayoutEngine((n) => renderer.measureNode(n, mindMap));
    renderer.renderFromLayout(engine.calculate(mindMap.root, 'Right'), mindMap, new Set(), 'Right');

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

describe('SvgRenderer Selection Update', () => {
  let renderer: SvgRenderer;
  let container: HTMLElement;
  let mindMap: MindMap;

  beforeEach(() => {
    container = document.createElement('div');
    // Provide clientHeight for render() to calculate center
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    renderer = new SvgRenderer(container);
    const root = new Node('root', 'Root');
    const child1 = new Node('c1', 'Child 1');
    const child2 = new Node('c2', 'Child 2');
    root.addChild(child1);
    root.addChild(child2);
    mindMap = new MindMap(root);
    // Initial full render to populate nodeElementMap
    const engine = new LayoutEngine((n) => renderer.measureNode(n, mindMap));
    renderer.renderFromLayout(engine.calculate(mindMap.root, 'Right'), mindMap, new Set(), 'Right');
  });

  it('should populate nodeElementMap after render', () => {
    // After render, each node should have an entry in nodeElementMap
    const el = container.querySelector('[data-id="c1"]');
    expect(el).not.toBeNull();
    // Verify nodeElementMap is populated by checking getNodeElement
    expect(renderer.getNodeElement('root')).toBeTruthy();
    expect(renderer.getNodeElement('c1')).toBeTruthy();
    expect(renderer.getNodeElement('c2')).toBeTruthy();
    expect(renderer.getNodeElement('nonexistent')).toBeUndefined();
  });

  it('should apply selection styles via updateSelection', () => {
    renderer.updateSelection(new Set(['c1']));

    const c1El = renderer.getNodeElement('c1');
    expect(c1El?.dataset.selected).toBe('true');

    // Non-selected node should have no selection marker
    const c2El = renderer.getNodeElement('c2');
    expect(c2El?.dataset.selected).toBeUndefined();
  });

  it('should clear previous selection when updating to new selection', () => {
    // First select c1
    renderer.updateSelection(new Set(['c1']));
    const c1El = renderer.getNodeElement('c1');
    expect(c1El?.dataset.selected).toBe('true');

    // Now select c2 instead
    renderer.updateSelection(new Set(['c2']));
    expect(c1El?.dataset.selected).toBeUndefined();

    const c2El = renderer.getNodeElement('c2');
    expect(c2El?.dataset.selected).toBe('true');
  });

  it('should not rebuild DOM when calling updateSelection', () => {
    const spy = vi.spyOn(document, 'createElement');
    const callsBefore = spy.mock.calls.length;

    renderer.updateSelection(new Set(['c1']));

    // No new DOM elements should be created
    expect(spy.mock.calls.length).toBe(callsBefore);
  });

  it('should sync selection state after full render (Bug Fix)', () => {
    // 1. Initial render with c1 selected
    const engine = new LayoutEngine((n) => renderer.measureNode(n, mindMap));
    renderer.renderFromLayout(
      engine.calculate(mindMap.root, 'Right'),
      mindMap,
      new Set(['c1']),
      'Right',
    );
    const c1El = renderer.getNodeElement('c1');
    expect(c1El?.dataset.selected).toBe('true');

    // 2. Perform delta selection update to c2
    // If bug exists, previousSelectedIds was empty after render(),
    // so it won't clear c1's selection styles.
    renderer.updateSelection(new Set(['c2']));

    expect(c1El?.dataset.selected).toBeUndefined();
    expect(renderer.getNodeElement('c2')?.dataset.selected).toBe('true');
  });
});
