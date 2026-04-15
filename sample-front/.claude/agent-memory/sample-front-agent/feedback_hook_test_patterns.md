---
name: Hook test patterns for infinite-scroll hooks
description: Key structural differences between useMemberList, useNonMemberList, and useUserList tests — what each hook exposes and how to adapt tests
type: feedback
---

Infinite-scroll hook tests in group-detail/model/__tests__/ follow this pattern:

1. Mock the API module at module scope with `vi.mock(...)`.
2. `beforeEach`: call `vi.clearAllMocks()`, `clearXxxCache()`, `MockIntersectionObserver.reset()`.
3. Test initial load, error, debounced search (300ms), loading state, then a `describe("無限スクロール")` block.

**useMemberList vs useNonMemberList key differences:**
- `useMemberList` does NOT expose `displayedCount` in its return value (useNonMemberList does).
  - Tests that need to verify displayedCount must use `members.length` as proxy.
- `useMemberList` returns `members` (not `users`); response shape is `{ members, total }` (not `{ users, total }`).
- `useMemberList` exports `clearMemberListCache` (not `clearNonMemberListCache`).
- `useMemberList` has a cache-restore path on mount; `useNonMemberList` always starts fresh.
- API: `fetchGroupMembers` from `@/pages/group-detail/api/fetch-group-members`.

**Sentinel trigger pattern** (reusable across hooks):
```ts
const triggerSentinel = () =>
  act(() => {
    MockIntersectionObserver.triggerAll([{ isIntersecting: true, target: document.createElement("div") }]);
  });
```

**Why:** These hooks share the same infinite-scroll structure (FETCH_LIMIT=100, DISPLAY_STEP=20) but expose different return shapes. Adapting tests requires careful attention to which fields are in the return value.

**useNonMemberList mock shape (AddMemberSheet.test.tsx):**
The `defaultHookReturn` mock object must include `lastBatchSize` — this field is part of the hook's return value and TypeScript will reject the mock without it. The mock incorrectly had `userCountLabel` (not in the return type). The correct mock shape is:
```ts
const defaultHookReturn = {
  users: [], total: 0, isLoading: false, error: null,
  searchQuery: "", setSearchQuery: vi.fn(),
  sentinelRef: { current: null },
  isFetchingMore: false, fetchMoreError: null,
  displayedCount: 20, lastBatchSize: 100,
};
```

**How to apply:** When writing tests for any new hook of this family, read the hook's return statement first to verify which fields are exposed before writing assertions against them. Always keep mock objects in sync with the hook's return type — TypeScript `TS2345` errors indicate a missing property.
