---
name: Group エンティティ実装状況
description: Group/GroupMember/User のモデル・DB スキーマ・エンドポイント一覧・soft delete の実装状況
type: project
---

## ドメインモデル（domain/group.go）

- `Group`: ID(uint64), Name(string), Description(string), MemberCount(int)
- `User`: ID(uint64), UUID(string), FirstName(string), LastName(string)
- `GroupRelation`: ParentGroupID(uint64), ChildGroupID(uint64)

## DB スキーマ

- `groups`: id, name, description, **updated_by（作成者 FK → users.id）**, **deleted_at（soft delete）**（20260403120000 + 20260417120000）
  - インデックス: `idx_groups_active(deleted_at, id)`
- `users`: id, first_name, last_name, created_at, updated_at, **deleted_at（soft delete）**（20260403120000）
  - インデックス: `idx_users_active(deleted_at, id)`
  - `search_key` VIRTUAL GENERATED COLUMN: `CONCAT(first_name, last_name, last_name, first_name)`（20260411120000）
- `group_members`: id, group_id, user_id（ユニーク制約あり）（20260403120000）
- `group_relations`: id, parent_group_id, child_group_id, created_at（UNIQUE: uk_parent_child, FK→groups CASCADE）（20260425000000）

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
| DELETE | /api/v1/groups/:id/members | DeleteGroupMembers（204 No Content） |
| POST | /api/v1/groups/:id/subgroups | CreateSubGroup（201 + GroupRelation JSON） |

## GroupService インターフェース（internal/rest/group.go）

```go
type GroupService interface {
    ListGroups(ctx context.Context, q string, limit, offset int) ([]domain.Group, int, error)
    GetByID(ctx context.Context, id uint64) (domain.Group, error)
    ListGroupMembers(ctx context.Context, id uint64, limit, offset int, q string) ([]domain.User, int, error)
    Store(ctx context.Context, name, description string, userID uint64) (domain.Group, error)
    Update(ctx context.Context, id uint64, name, description string, userID uint64) (*domain.Group, error)
    Delete(ctx context.Context, id uint64, userID uint64) error
    ListNonGroupMembers(ctx context.Context, groupID uint64, limit, offset int, q string) ([]domain.User, int, error)
    AddGroupMembers(ctx context.Context, groupID uint64, userIDs []uint64) ([]domain.User, error)
    RemoveGroupMembers(ctx context.Context, groupID uint64, userIDs []uint64) error
    CreateSubGroup(ctx context.Context, parentGroupID, childGroupID uint64) (domain.GroupRelation, error)
}
```

- `Store` の handler では `c.Get("authUser").(domain.User)` で authUser を取得し、型アサーション失敗時は 401 を返す
- `Store` の repository 実装はトランザクション内で groups INSERT → group_members INSERT（作成者を初期メンバーに追加）し、MemberCount: 1 を返す
- `Update` の handler も同様に authUser を取得して 401 チェックを行い、`userID` を service に渡す
- `Update` の repository 実装は `UPDATE groups SET name=?, description=?, updated_by=? WHERE id=? AND deleted_at IS NULL` を実行し、RowsAffected=0 で ErrNotFound を返す。成功後は GetByID で最新データを返す

## GroupRepository インターフェース（group/service.go）

`ListGroupMembers`, `ListNonGroupMembers`, `AddGroupMembers`, `RemoveGroupMembers` が追加されている。

シグネチャは全レイヤーで統一：
- `ListGroupMembers(ctx, id uint64, limit, offset int, q string) ([]domain.User, int, error)`
- `ListNonGroupMembers(ctx, groupID uint64, limit, offset int, q string) ([]domain.User, int, error)`
- `RemoveGroupMembers(ctx, groupID uint64, userIDs []uint64) error`

## UserRepository インターフェース（group/service.go）

`group.UserRepository` は `CountByIDs` のみを持つ（`GetByID` は service から使用しないため削除済み）：

```go
type UserRepository interface {
    CountByIDs(ctx context.Context, ids []uint64) (int, error)
}
```

- `NewService(repo GroupRepository, userRepo UserRepository) *Service` — 2 引数シグネチャ（互換維持）
- `NewServiceWithRelation(repo, userRepo, relationRepo) *Service` — GroupRelationRepository を注入する 3 引数シグネチャ。main.go では `NewServiceWithRelation` を使用
- `GroupRelationRepository` インターフェース（group/service.go）: `GetAncestorIDs`, `GetDescendantIDs`, `CountComponentGroups`, `MaxDepthInComponent`, `CreateRelation`
- MySQL 実装: `internal/repository/mysql/group_relation.go`（WITH RECURSIVE CTE で祖先・子孫集合を取得）
- `group/mocks/group_relation_repository_mock.go`（手動 mock）
- サイクル検出: GetAncestorIDs(parent) に child が含まれる OR GetDescendantIDs(child) に parent が含まれるなら 400
- MySQL 実装: `internal/repository/mysql/user.go` の `UserRepository` 型が `group.UserRepository`・`user.UserRepository`・`auth.UserRepository` の 3 つを実装
- `main.go` では `groupRepo` と `userRepo` を分けて生成して両方のサービスに渡す
- `AddGroupMembers` のユーザー存在確認は `userRepo.CountByIDs` で 1 クエリ
- `RemoveGroupMembers` は service 層でグループ存在確認 → repository 層でトランザクション DELETE

**How to apply:** 新機能追加時は GroupService と GroupRepository / UserRepository の両 IF を同時に更新し、mock も同じ変更セットで追随させる。
