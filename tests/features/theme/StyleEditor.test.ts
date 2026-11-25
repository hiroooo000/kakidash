// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { StyleEditor } from '../../../src/features/theme/components/StyleEditor';

describe('StyleEditor', () => {
  it('should be hidden by default upon creation', () => {
    const container = document.createElement('div');
    const editor = new StyleEditor(container);

    expect(editor.editorEl.style.display).toBe('none');
  });

  it('should become flex when show() is called and none when hide() is called', () => {
    const container = document.createElement('div');
    const editor = new StyleEditor(container);

    editor.show('node-1', { fontSize: '16px' });
    expect(editor.editorEl.style.display).toBe('flex');

    editor.hide();
    expect(editor.editorEl.style.display).toBe('none');
  });
});
