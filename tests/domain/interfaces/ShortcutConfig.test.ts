import { describe, it, expect } from 'vitest';
import { DEFAULT_SHORTCUTS } from '../../../src/domain/interfaces/ShortcutConfig';

describe('DEFAULT_SHORTCUTS', () => {
  it('should include "d" key for deleteNode', () => {
    const deleteShortcuts = DEFAULT_SHORTCUTS.deleteNode;
    expect(deleteShortcuts).toBeDefined();

    // Check if 'd' key is present
    const hasDKey = deleteShortcuts?.some((binding) => binding.key === 'd');
    expect(hasDKey).toBe(true);
  });

  it('should still include "Delete" and "Backspace" for deleteNode', () => {
    const deleteShortcuts = DEFAULT_SHORTCUTS.deleteNode;
    const hasDelete = deleteShortcuts?.some((binding) => binding.key === 'Delete');
    const hasBackspace = deleteShortcuts?.some((binding) => binding.key === 'Backspace');

    expect(hasDelete).toBe(true);
    expect(hasBackspace).toBe(true);
  });
});
