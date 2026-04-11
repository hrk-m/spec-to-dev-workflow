---
name: Group エンティティ実装状況
description: Group/GroupMember/User のモデル・DB スキーマ・エンドポイント一覧・soft delete の実装状況
type: project
---

## ドメインモデル（domain/group.go）

- `Group`: ID(uint64), Name(string), Description(string), MemberCount(int)
- `GroupMember`: ID(uint64), FirstName(string), LastName(string)
- `User`: ID(uint64), FirstName(string), LastName(string) — add-group-member 機能で追加

## DB スキーマ

- `groups`: id, name, description, **deleted_at（soft delete）**（20260403120000）
  - インデックス: `idx_groups_active(deleted_at, id)`
- `users`: id, first_name, last_name, created_at, updated_at, **deleted_at（soft delete）**（20260403120000）
  - インデックス: `idx_users_active(deleted_at, id)`
  - `search_key` VIRTUAL GENERATED COLUMN: `CONCAT(first_name, last_name, last_name, first_name)`（20260411120000）
- `group_members`: id, group_id, user_id（ユニーク制約あり）（20260403120000）

## Soft Delete の実装

`groups` と `users` の両テーブルに `deleted_at` カラムがある。Repository のクエリは `WHERE deleted_at IS NULL` で論理削除されたレコードを除外している。domain モデルには `deleted_at` フィールドは露出していない（DB レイヤーのみ）。

## エンドポイント一覧

| メソッド | パス | ハンドラ |
|---|---|---|
| GET | /api/v1/groups | ListGroups |
| GET | /api/v1/groups/:id | GetByID |
| GET | /api/v1/groups/:id/members | ListGroupMembers |
| GET | /api/v1/groups/:id/non-members | ListNonGroupMembers（200 + users/total） |
| POST | /api/v1/groups | Store |
| POST | /api/v1/groups/:id/members | AddGroupMembers（201 + members） |
| PUT | /api/v1/groups/:id | Update |
| DELETE | /api/v1/groups/:id | Delete (soft delete, 204 No Content) |

## GroupService インターフェース（internal/rest/group.go）

```go
type GroupService interface {
    ListGroups(ctx context.Context, q string, limit, offset int) ([]domain.Group, int, error)
    GetByID(ctx context.Context, id uint64) (domain.Group, error)
    ListGroupMembers(ctx context.Context, id, limit, offset uint64, q string) ([]domain.GroupMember, int, error)
    Store(ctx context.Context, name, description string) (domain.Group, error)
    Update(ctx context.Context, id int64, name, description string) (*domain.Group, error)
    Delete(ctx context.Context, id int64) error
    ListNonGroupMembers(ctx context.Context, groupID, limit, offset int, q string) ([]domain.User, int64, error)
    AddGroupMembers(ctx context.Context, groupID uint64, userIDs []uint64) ([]domain.User, error)
}
```

## GroupRepository インターフェース（group/service.go）

ListNonGroupMembers, GetUserByID, AddGroupMembers が追加されている。

注意: `ListNonGroupMembers` のシグネチャは Service 側が `(groupID, limit, offset int, ...)` で受け取り、
内部で `uint64` に変換して Repository の `(groupID uint64, limit, offset int, ...)` を呼ぶ。

**How to apply:** 新機能追加時は GroupService と GroupRepository の両 IF を同時に更新し、mock も同じ変更セットで追随させる。
