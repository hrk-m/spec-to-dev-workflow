---
name: steering sync 差異パターン
description: steering 更新時に domain.User と domain.GroupMember の混同が起きやすいポイント
type: feedback
---

steering の tech.md / product.md を更新する際、`ListGroupMembers` の戻り値型を `[]domain.User` と誤記しやすい。実際は `[]domain.GroupMember`（source_groups フィールドを含む別型）。

**Why:** 過去に tech.md と product.md の両方でこの誤記が発生していた（GroupService / GroupRepository インターフェース記述で `[]domain.User` と記載されていた）。

**How to apply:** steering の GroupService・GroupRepository インターフェース定義を記述する際は `ListGroupMembers` の戻り値を必ず `[]domain.GroupMember` と明記する。また `GroupService` に `DeleteSubGroup` メソッドが含まれることも漏れなく記述する。
