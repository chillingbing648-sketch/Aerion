type Handler<T = any> = (data: T) => void;

class EventBus {
  private handlers: Record<string, Handler[]> = {};

  public on<T = any>(event: string, fn: Handler<T>): () => void {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(fn);
    return () => {
      this.off(event, fn);
    };
  }

  public off(event: string, fn: Handler): void {
    if (!this.handlers[event]) return;
    this.handlers[event] = this.handlers[event].filter(h => h !== fn);
  }

  public emit<T = any>(event: string, data?: T): void {
    if (!this.handlers[event]) return;
    this.handlers[event].forEach(fn => {
      try {
        fn(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }

  public clear(): void {
    this.handlers = {};
  }
}

export const spatialBus = new EventBus();
