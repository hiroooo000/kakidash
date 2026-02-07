import { describe, it, expect, beforeEach } from 'vitest';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { SvgRenderer } from '../../src/presentation/components/SvgRenderer';
import { Node } from '../../src/domain/entities/Node';

describe('SvgRenderer Auto Link', () => {
  let container: HTMLElement;
  let renderer: SvgRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    // Mock dimensions for JSDOM
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    renderer = new SvgRenderer(container);
  });

  it('should render an <a> tag for a simple URL', () => {
    const url = 'https://example.com';
    const node = new Node('1', url);

    (renderer as any).renderNode(node, 0, 0, null, 'Right', false, 'right');
    const nodeEl = renderer.nodeContainer.querySelector(`[data-id="${node.id}"]`) as HTMLElement;

    // Find anchor tag
    const anchor = nodeEl.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.href).toBe(url + '/'); // Browser might normalize URL (add trailing slash depending on implementation, but let's check basic href)
    // Actually JSDOM might not add trailing slash if not present? Let's be lenient or exact.
    // In JSDOM, href attribute usually reflects what was set.
    expect(anchor?.getAttribute('href')).toBe(url);
    expect(anchor?.target).toBe('_blank');
    expect(anchor?.textContent).toBe(url);
  });

  it('should render text and <a> tag for text mixed with URL', () => {
    const textBefore = 'Check this ';
    const url = 'https://google.com';
    const textAfter = ' out!';
    const node = new Node('2', textBefore + url + textAfter);

    (renderer as any).renderNode(node, 0, 0, null, 'Right', false, 'right');
    const nodeEl = renderer.nodeContainer.querySelector(`[data-id="${node.id}"]`) as HTMLElement;

    const anchor = nodeEl.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe(url);
    expect(nodeEl.textContent).toContain(textBefore);
    expect(nodeEl.textContent).toContain(textAfter);
  });

  it('should escape HTML tags and not execute script', () => {
    const malicious = '<script>alert(1)</script>';
    const node = new Node('3', malicious);

    (renderer as any).renderNode(node, 0, 0, null, 'Right', false, 'right');
    const nodeEl = renderer.nodeContainer.querySelector(`[data-id="${node.id}"]`) as HTMLElement;

    // Should NOT contain a script tag
    expect(nodeEl.querySelector('script')).toBeNull();
    // Text content should contain the string, but as text
    expect(nodeEl.textContent).toBe(malicious);
    // InnerHTML should contain escaped entities
    expect(nodeEl.innerHTML).toContain('&lt;script&gt;');
  });

  it('should handle multiple URLs', () => {
    const url1 = 'https://a.com';
    const url2 = 'http://b.org';
    const node = new Node('4', `${url1} and ${url2}`);

    (renderer as any).renderNode(node, 0, 0, null, 'Right', false, 'right');
    const nodeEl = renderer.nodeContainer.querySelector(`[data-id="${node.id}"]`) as HTMLElement;

    const anchors = nodeEl.querySelectorAll('a');
    expect(anchors.length).toBe(2);
    expect(anchors[0].getAttribute('href')).toBe(url1);
    expect(anchors[1].getAttribute('href')).toBe(url2);
  });
});
