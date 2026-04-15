---
name: MockIntersectionObserver test setup
description: How MockIntersectionObserver works in sample-front/src/test/setup.ts and how to use it in tests
type: project
---

## Location
`sample-front/src/test/setup.ts`

## How it works
- `MockIntersectionObserver` is a class that implements `IntersectionObserver`
- Every time `new IntersectionObserver(callback)` is called, the instance is pushed to `MockIntersectionObserver.instances`
- `triggerAll(entries)` calls the callback on ALL registered instances
- `reset()` clears `instances` array (call in `beforeEach`)
- Assigned to `global.IntersectionObserver` so all code using `new IntersectionObserver()` gets the mock

## Import in tests
```ts
import { MockIntersectionObserver } from "@/test/setup";
```

## Usage pattern
```ts
beforeEach(() => {
  vi.clearAllMocks();
  clearGroupListCache();
  MockIntersectionObserver.reset(); // must reset between tests
});

// To trigger sentinel:
act(() => {
  MockIntersectionObserver.triggerAll([{ isIntersecting: true, target: document.createElement("div") }]);
});
await waitFor(() => { ... });
```

## Critical: observer must be created without sentinel check
If the IntersectionObserver useEffect early-returns when `sentinelRef.current === null`, no observer is registered in `instances`, and `triggerAll` has nothing to trigger. This breaks `renderHook` tests (no DOM) and component tests where the sentinel isn't yet attached.

Always create the observer unconditionally; only call `observe(sentinel)` conditionally:
```ts
const observer = new IntersectionObserver(callback, options); // always created
const sentinel = sentinelRef.current;
if (sentinel) observer.observe(sentinel); // conditional
return () => observer.disconnect();
```
