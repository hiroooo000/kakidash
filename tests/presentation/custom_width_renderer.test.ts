import { describe, it, expect, beforeEach } from 'vitest';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { SvgRenderer } from '../../src/presentation/components/SvgRenderer';
import { Node } from '../../src/domain/entities/Node';

describe('SvgRenderer Custom Width', () => {
  let container: HTMLElement;
  let renderer: SvgRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    // Mock dimensions for JSDOM
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });

    renderer = new SvgRenderer(container);
  });

  it('should apply global maxWidth when customWidth is not set', () => {
    renderer.maxWidth = 200;
    const node = new Node('1', 'Long text that should wrap');

    renderer.measureNode(node);

    // In JSDOM, text measurement is tricky, but we can check if the style was applied to the element.
    // We need to spy on internal element creation or inspect the logic result.
    // simpler: Let's inspect the renderNode output by creating a mock element spy?
    // Or just rely on the fact that if maxWidth is applied, the width calculation will be bounded.
    // Actually, measureNode returns { width, height }.
    // If maxWidth is set, width should be constrained (if logic works like that).
    // In SvgRenderer implementation:
    // if (effectiveMaxWidth !== undefined) { el.style.maxWidth = ... }

    // Let's create a node with explicit customWidth and verify renderNode sets correct style
    // We can assume renderNode appends to nodeContainer.

    (renderer as any).renderNode(node, 0, 0, null, 'Right', false, 'right');
    const nodeEl = renderer.nodeContainer.querySelector(`[data-id="${node.id}"]`) as HTMLElement;
    expect(nodeEl).toBeTruthy();
    expect(nodeEl.style.maxWidth).toBe('200px');
  });

  it('should apply customWidth over global maxWidth', () => {
    renderer.maxWidth = 200;
    const node = new Node('1', 'Long text');
    node.customWidth = 300;

    (renderer as any).renderNode(node, 0, 0, null, 'Right', false, 'right');
    const nodeEl = renderer.nodeContainer.querySelector(`[data-id="${node.id}"]`) as HTMLElement;

    expect(nodeEl.style.maxWidth).toBe('300px');
  });

  it('should apply customWidth even if global maxWidth is disabled (-1)', () => {
    renderer.maxWidth = -1;
    const node = new Node('1', 'Long text');
    node.customWidth = 150;

    (renderer as any).renderNode(node, 0, 0, null, 'Right', false, 'right');
    const nodeEl = renderer.nodeContainer.querySelector(`[data-id="${node.id}"]`) as HTMLElement;

    expect(nodeEl.style.maxWidth).toBe('150px');
  });
  // Note: We cannot easily test MindMapController logic here because this test is for SvgRenderer. 
  // The fix was in MindMapController.
  // However, we established SvgRenderer exposes the nodeContainer which we used in the fix.
  // We should add a new test file or update this one if we want to test Controller logic, 
  // but Controller tests are usually in MindMapController.test.ts.
  // I will create a new test file for the bug fix verification specifically.
});
