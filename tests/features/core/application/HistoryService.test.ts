import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../../../../src/features/core/application/HistoryService';
import { MindMapData } from '../../../../src/features/core/domain/MindMapData';

describe('HistoryService', () => {
  let service: HistoryService;

  beforeEach(() => {
    service = new HistoryService(10);
  });

  it('should save and undo state', () => {
    const state1 = { nodeData: { id: '1', topic: 'A' } } as MindMapData;
    const state2 = { nodeData: { id: '1', topic: 'B' } } as MindMapData;

    service.saveState(state1);
    expect(service.canUndo).toBe(true);

    const prev = service.undo(state2);
    expect(prev).toEqual(state1);
    expect(service.canUndo).toBe(false);
  });

  it('should redo state', () => {
    const state1 = { nodeData: { id: '1', topic: 'A' } } as MindMapData;
    const state2 = { nodeData: { id: '1', topic: 'B' } } as MindMapData;

    service.saveState(state1);
    const prev = service.undo(state2);
    expect(prev).toEqual(state1);
    expect(service.canRedo).toBe(true);

    const next = service.redo(state1);
    expect(next).toEqual(state2);
    expect(service.canRedo).toBe(false);
  });
});
