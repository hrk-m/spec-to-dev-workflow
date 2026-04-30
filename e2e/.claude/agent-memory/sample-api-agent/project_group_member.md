---
name: GroupMember 型と source_groups レスポンス
description: ListGroupMembers は domain.GroupMember を返し HTTP レスポンスに source_groups フィールドを含む。domain.User とは別型
type: project
---

`GET /api/v1/groups/:id/members` のレスポンスは `domain.GroupMember` を使用する。`domain.User` とは別の型。

`domain.GroupMember` は `id, uuid, first_name, last_name` に加えて `Sources []domain.GroupMemberSource` フィールドを持つ。HTTP レスポンスでは `source_groups: [{group_id, group_name}]` として JSON 出力される（`groupMemberItem` 型でシリアライズ）。

`SearchKey` フィールドは DB スキャン用（内部のみ）で JSON タグなし。外部には露出しない。

インターフェースシグネチャ：
- `GroupService.ListGroupMembers` → `([]domain.GroupMember, int, error)`
- `GroupRepository.ListGroupMembers` → `([]domain.GroupMember, int, error)`
- `rest/mocks.MockGroupService.ListGroupMembers` → `([]domain.GroupMember, int, error)`

**Why:** ListGroupMembers は自グループ＋全子孫グループのメンバーを WITH RECURSIVE CTE + JSON_ARRAYAGG で取得し、ユーザーごとに所属元グループ情報をまとめて返す機能を持つため専用型が必要。

**How to apply:** steering 更新時や新機能追加時に `[]domain.User` と混同しないこと。ListGroupMembers の戻り値は必ず `[]domain.GroupMember`。
