import { MindMapData } from '../domain/MindMapData';
import { HistoryManager } from './HistoryManager';

export class HistoryService {
  private historyManager: HistoryManager<MindMapData>;

  constructor(maxHistorySize: number = 10) {
    this.historyManager = new HistoryManager<MindMapData>(maxHistorySize);
  }

  saveState(state: MindMapData): void {
    this.historyManager.push(state);
  }

  undo(currentState: MindMapData): MindMapData | null {
    return this.historyManager.undo(currentState);
  }

  redo(currentState: MindMapData): MindMapData | null {
    return this.historyManager.redo(currentState);
  }

  get canUndo(): boolean {
    return this.historyManager.canUndo;
  }

  get canRedo(): boolean {
    return this.historyManager.canRedo;
  }
}
