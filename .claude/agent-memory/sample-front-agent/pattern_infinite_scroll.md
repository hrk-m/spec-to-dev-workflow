---
name: IntersectionObserver infinite scroll pattern
description: Implementation and testing patterns for IntersectionObserver-based infinite scroll hooks in sample-front (group-list, user-list, member-list, useNonMemberList)
type: project
---

## Pattern Overview

All 4 list hooks (group-list, user-list, member-list, useNonMemberList) use the same infinite scroll pattern.

## Key Implementation Details

### Refs for stale closures
The IntersectionObserver callback captures values at creation time. Use mirror refs updated via useEffect:
```ts
const isFetchingMoreRef = useRef(isFetchingMore);
useEffect(() => { isFetchingMoreRef.current = isFetchingMore; }, [isFetchingMore]);
```
Refs needed: isFetchingMore, isLoading, displayedCount, cachedLength, lastBatchSize, fetchedOffset, debouncedQuery.

### Always create the observer (critical for tests)
DO NOT early-return if sentinelRef.current is null. Always create the IntersectionObserver so it registers in MockIntersectionObserver.instances. Only call observe() conditionally:
```ts
useEffect(() => {
  const observer = new IntersectionObserver((entries) => { ... }, { threshold: 0.1 });
  const sentinel = sentinelRef.current;
  if (sentinel) observer.observe(sentinel);
  return () => observer.disconnect();
}, [doFetchMore]);
```

### Sentinel callback logic (PRD-compliant: always DISPLAY_STEP increments)
```ts
if (currentDisplayed < cacheLength) {
  // Always reveal DISPLAY_STEP more items from cache
  setDisplayedCount((prev) => prev + DISPLAY_STEP);
} else if (lastBatchSizeRef.current === FETCH_LIMIT) {
  // Cache fully displayed, fetch next batch
  doFetchMore(fetchedOffsetRef.current, debouncedQueryRef.current);
}
```

**PRD requirement**: Never jump to full cache length at once. Always increment by DISPLAY_STEP (20). doFetchMore fires only when `displayedCount >= cacheLength` AND `lastBatchSize === FETCH_LIMIT`.

**Testing implication**: To trigger doFetchMore with a FETCH_LIMIT-sized cache (100 items), you need 5 sentinel triggers (20*5=100 = cacheLength) then a 6th trigger fires doFetchMore. Use sequential waitFor between triggers:
```ts
const triggerSentinel = () => act(() => MockIntersectionObserver.triggerAll([...]));
triggerSentinel();
await waitFor(() => { expect(result.current.users).toHaveLength(40); });
// ... repeat up to 100
triggerSentinel(); // 5th trigger exhausts cache
await waitFor(() => { expect(result.current.users).toHaveLength(100); });
triggerSentinel(); // 6th trigger fires doFetchMore
await waitFor(() => { expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ offset: FETCH_LIMIT })); });
```

### Separate doFetchMore from doFetch
- `doFetch`: used for initial/search load. Sets isLoading, replaces cachedUsers.
- `doFetchMore`: used for appending. Sets isFetchingMore, appends to cachedUsers. On error: sets fetchMoreError (not error), existing items preserved.

### Constants
- `FETCH_LIMIT = 100` (exported for tests)
- `DISPLAY_STEP = 20` (private)

### On search change (debouncedQuery change)
Reset: setCachedUsers([]), setDisplayedCount(DISPLAY_STEP), setFetchedOffset(0), setLastBatchSize(FETCH_LIMIT), then doFetch(0, debouncedQuery, false).

## UI Components
- Add `<div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" data-testid="sentinel" />` at bottom
- Show `<Spinner>` when isFetchingMore
- Show fetchMoreError message when fetchMoreError is set
- Remove all pagination UI (Previous/Next buttons, perPage selector)

## userCountLabel
Do NOT return "No users found" in `userCountLabel` — it conflicts with the empty state UI text. Return `"${total} users"` always (except loading state).
