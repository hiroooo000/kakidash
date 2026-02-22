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
});
