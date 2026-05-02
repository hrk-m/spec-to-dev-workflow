---
name: Conditional object property with spread
description: When a fetch function param should be absent (not undefined) when not applicable, use spread syntax instead of assigning undefined
type: feedback
---

URLSearchParams や `not.toHaveProperty()` テストで `exclude_group_ids: undefined` はプロパティが「存在する（値が undefined）」として扱われるため、テストが失敗する。

正しいパターン:
```typescript
fetchGroupMembers({
  groupId,
  limit: FETCH_LIMIT,
  offset,
  ...(param !== undefined && { exclude_group_ids: param }),
})
```

NG パターン:
```typescript
fetchGroupMembers({
  groupId,
  limit: FETCH_LIMIT,
  offset,
  exclude_group_ids: param, // param=undefined でもプロパティが存在してしまう
})
```

**Why:** `not.toHaveProperty("exclude_group_ids")` は `{ exclude_group_ids: undefined }` でも FAIL する。プロパティの有無をテストする際は、スプレッドで条件付き追加が必要。

**How to apply:** `fetchGroupMembers` 等の API 呼び出しで optional なクエリパラメータを追加する際は、値が存在する場合のみスプレッドで追加する。
