/**
 * Domain Event Bus & Domain Event Definitions
 * Decouples state mutations from secondary concerns (indexing, audit, oracles).
 */

export interface DomainEvent<T = unknown> {
  eventId: string;
  eventName: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  correlationId: string;
  actorId?: string;
  payload: T;
}

export type DomainEventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void> | void;

export class DomainEventBus {
  private static instance: DomainEventBus;
  private handlers: Map<string, DomainEventHandler[]> = new Map();
  private eventHistory: DomainEvent[] = [];

  private constructor() {}

  public static getInstance(): DomainEventBus {
    if (!this.instance) {
      this.instance = new DomainEventBus();
    }
    return this.instance;
  }

  public subscribe<T = unknown>(eventName: string, handler: DomainEventHandler<T>): void {
    const list = this.handlers.get(eventName) || [];
    list.push(handler as DomainEventHandler);
    this.handlers.set(eventName, list);
  }

  public async publish<T = unknown>(event: DomainEvent<T>): Promise<void> {
    this.eventHistory.push(event);
    if (this.eventHistory.length > 5000) {
      this.eventHistory.shift();
    }

    const handlers = this.handlers.get(event.eventName) || [];
    const wildcardHandlers = this.handlers.get('*') || [];
    const allHandlers = [...handlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(event);
      } catch (err: any) {
        console.error(`[EventBus Error] Handler for '${event.eventName}' failed:`, err.message);
      }
    }
  }

  public getHistory(): readonly DomainEvent[] {
    return this.eventHistory;
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }
}
