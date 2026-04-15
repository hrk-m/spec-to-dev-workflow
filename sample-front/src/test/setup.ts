import "@testing-library/jest-dom";

// IntersectionObserver mock for jsdom environment
// jsdom does not implement IntersectionObserver natively
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [0];

  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    // Register this observer so tests can trigger intersection events
    MockIntersectionObserver.instances.push(this);
  }

  observe(_target: Element): void {
    // no-op in tests unless explicitly triggered
  }

  unobserve(_target: Element): void {
    // no-op
  }

  disconnect(): void {
    // no-op
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Trigger the callback with given entries (for use in tests) */
  triggerIntersect(entries: Partial<IntersectionObserverEntry>[]): void {
    this.callback(entries as IntersectionObserverEntry[], this);
  }

  static instances: MockIntersectionObserver[] = [];

  static reset(): void {
    MockIntersectionObserver.instances = [];
  }

  static triggerAll(entries: Partial<IntersectionObserverEntry>[]): void {
    MockIntersectionObserver.instances.forEach((obs) => obs.triggerIntersect(entries));
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

export { MockIntersectionObserver };
