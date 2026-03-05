import { Command } from './Command';

type CommandHandler<T extends Command['type']> = (command: Extract<Command, { type: T }>) => void;

export class CommandBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers = new Map<Command['type'], Set<CommandHandler<any>>>();

  public on<T extends Command['type']>(type: T, handler: CommandHandler<T>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  public off<T extends Command['type']>(type: T, handler: CommandHandler<T>): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler);
      if (typeHandlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  public dispatch(command: Command): void {
    const typeHandlers = this.handlers.get(command.type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => handler(command));
    }
  }

  public destroy(): void {
    this.handlers.clear();
  }
}
