---
name: vitest vi.mock hoisting pattern
description: vi.mock is hoisted before imports — use vi.hoisted() for mock references shared between vi.mock factories and test bodies
type: feedback
---

When a `vi.mock` factory needs to reference a variable (e.g., `mockApiFetch`) that is also used in test bodies, defining the variable at the top level causes `ReferenceError: Cannot access before initialization` because `vi.mock` is hoisted above `const` declarations.

**Solution**: Use `vi.hoisted(() => vi.fn())` to create mock references that survive hoisting:

```ts
const mockApiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api", () => ({
  apiFetch: mockApiFetch, // ✅ works — mockApiFetch is hoisted too
}));
```

**Why:** `vi.mock` calls are hoisted to the top of the file by Vitest's transformer, but regular `const` declarations are not. `vi.hoisted` creates a value that is also hoisted, making it safe to reference inside `vi.mock` factories.

**How to apply:** Whenever a mock function needs to be accessed both inside a `vi.mock()` factory and in test assertions, always use `vi.hoisted(() => vi.fn())` instead of a plain `const`.
