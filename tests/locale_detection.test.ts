// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Kakidash } from '../src/index';

describe('Kakidash Locale Detection', () => {
  beforeEach(() => {
    // navigator.language をモック可能にするためにObject.definePropertyを使用
    vi.stubGlobal('navigator', {
      ...navigator,
      language: 'en-US',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should default to "en" when navigator.language is English', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'en-US' });
    const container = document.createElement('div');
    const board = new Kakidash(container);
    // @ts-expect-error: Accessing private property for testing
    expect(board.controller.locale).toBe('en');
  });

  it('should detect "ja" when navigator.language is Japanese', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'ja-JP' });
    const container = document.createElement('div');
    const board = new Kakidash(container);
    // @ts-expect-error: Accessing private property for testing
    expect(board.controller.locale).toBe('ja');
  });

  it('should detect "ja" when navigator.language is just "ja"', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'ja' });
    const container = document.createElement('div');
    const board = new Kakidash(container);
    // @ts-expect-error: Accessing private property for testing
    expect(board.controller.locale).toBe('ja');
  });

  it('should respect explicit locale in options even if navigator.language is different', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'ja-JP' });
    const container = document.createElement('div');
    const board = new Kakidash(container, { locale: 'en' });
    // @ts-expect-error: Accessing private property for testing
    expect(board.controller.locale).toBe('en');
  });
});
