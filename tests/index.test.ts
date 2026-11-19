// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { Kakidash } from '../src/index';

describe('Kakidash', () => {
  it('should be defined', () => {
    expect(Kakidash).toBeDefined();
  });

  it('should be instantiable', () => {
    const container = document.createElement('div');
    const board = new Kakidash(container);
    expect(board).toBeInstanceOf(Kakidash);
  });

  it('should register a custom command', () => {
    const container = document.createElement('div');
    const board = new Kakidash(container);
    const handler = () => {};
    const command = {
      id: 'test-command',
      topic: 'Test Command',
      execute: handler,
    };

    // This should not throw and internally call controller.registerCommand
    expect(() => board.registerCommand(command)).not.toThrow();
  });

  it('should register migrated legacy images into ImageStore on loadData', () => {
    const container = document.createElement('div');
    const board = new Kakidash(container);
    const legacyImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    board.loadData({
      nodeData: {
        id: 'root',
        topic: 'Root',
        root: true,
        children: [
          {
            id: 'img-1',
            topic: '',
            image: legacyImage,
          },
        ],
      },
    });

    const exported = board.getData();
    const imgNode = exported.nodeData.children?.[0];
    expect(imgNode?.image).toBeUndefined();
    expect(imgNode?.imageRef).toBeDefined();
    expect(imgNode?.thumbnail).toBe(legacyImage);

    const images = board.getImages();
    expect(images[imgNode!.imageRef!]).toBe(legacyImage);
  });
});
