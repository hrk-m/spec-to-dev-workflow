---
name: API default params
description: Default limit values for fetch functions — PRD-required values for non-member and other list APIs
type: project
---

## fetch-non-members.ts

Default `limit` is `100` (PRD requirement). Previously incorrectly set to 500.

```ts
limit: String(params.limit ?? 100),
```

**Why:** PRD specifies limit=100 to align with FETCH_LIMIT constant used throughout infinite scroll hooks.

**How to apply:** If you see `params.limit ?? 500` in fetch-non-members.ts, it is a bug — should be 100.
