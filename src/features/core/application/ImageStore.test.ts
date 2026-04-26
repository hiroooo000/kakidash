import { describe, it, expect, beforeEach } from 'vitest';
import { ImageStore } from './ImageStore';

describe('ImageStore', () => {
  let store: ImageStore;

  beforeEach(() => {
    store = new ImageStore();
  });

  it('should store and retrieve images by ref', () => {
    store.addImage('img1.png', 'base64data1');
    expect(store.getImage('img1.png')).toBe('base64data1');
  });

  it('should return undefined for non-existent image', () => {
    expect(store.getImage('nonexistent.png')).toBeUndefined();
  });

  it('should remove image by ref', () => {
    store.addImage('img1.png', 'base64data1');
    store.removeImage('img1.png');
    expect(store.getImage('img1.png')).toBeUndefined();
  });

  it('should list all stored refs', () => {
    store.addImage('img1.png', 'base64data1');
    store.addImage('img2.png', 'base64data2');

    const refs = store.getAllRefs();
    expect(refs).toHaveLength(2);
    expect(refs).toContain('img1.png');
    expect(refs).toContain('img2.png');
  });

  it('should clear all stored images', () => {
    store.addImage('img1.png', 'base64data1');
    store.addImage('img2.png', 'base64data2');
    store.clear();

    expect(store.getAllRefs()).toHaveLength(0);
    expect(store.getImage('img1.png')).toBeUndefined();
  });
});
