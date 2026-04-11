---
name: Group エンティティ実装状況
description: Group/GroupMember のモデル・DB スキーマ・エンドポイント一覧・soft delete の実装状況
type: project
---

## ドメインモデル（domain/group.go）

- `Group`: ID(uint64), Name(string), Description(string), MemberCount(int)
- `GroupMember`: ID(uint64), FirstName(string), LastName(string)

## DB スキーマ（db/migrate/20260403120000_create_tables.up.sql）

- `groups`: id, name, description, **deleted_at（soft delete）**
  - インデックス: `idx_groups_active(deleted_at, id)`
- `users`: id, first_name, last_name, created_at, updated_at, **deleted_at（soft delete）**
  - インデックス: `idx_users_active(deleted_at, id)`
- `group_members`: id, group_id, user_id（ユニーク制約あり）

## Soft Delete の実装

`groups` と `users` の両テーブルに `deleted_at` カラムがある。Repository のクエリは `WHERE deleted_at IS NULL` で論理削除されたレコードを除外している。domain モデルには `deleted_at` フィールドは露出していない（DB レイヤーのみ）。

## エンドポイント一覧

| メソッド | パス | ハンドラ |
|---|---|---|
| GET | /api/v1/groups | ListGroups |
| GET | /api/v1/groups/:id | GetByID |
| GET | /api/v1/groups/:id/members | ListGroupMembers |
| POST | /api/v1/groups | Store |
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
}
```

**How to apply:** 新機能追加時は GroupService と GroupRepository の両 IF を同時に更新し、mock も同じ変更セットで追随させる。
