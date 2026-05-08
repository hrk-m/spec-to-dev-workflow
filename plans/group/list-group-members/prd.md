# PRD: list-group-members

## 概要

| 項目         | 内容                                                                                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 機能名       | `list-group-members`                                                                                                                                                                            |
| 目的         | グループ詳細画面で、自グループ直属メンバーに加えて全子孫サブグループのメンバーを統合表示する。サブグループ単位のチェックボックスフィルターで 2 万件規模のメンバーを絞り込み表示できるようにする |
| API          | `GET /api/v1/groups/:id/members`                                                                                                                                                                |
| 認証         | 必要（AuthMiddleware）                                                                                                                                                                          |
| データソース | MySQL (`sample-api/internal/repository/mysql`) — `groups` / `group_members` / `group_relations` / `users`                                                                                       |

### 依存関係・前提条件

- **`add-subgroup`（`plans/group/add-subgroup`）の実装が先行されていること** — 本機能は `group_relations` テーブルと `GroupRelationRepository` を WITH RECURSIVE で辿るため、以下が先に存在する必要がある:
  - migration: `db/migrate/20260425000000_create_group_relations.up.sql`
  - repository: `sample-api/internal/repository/mysql/group_relation.go`
  - DB スキーマ詳細は [plans/schema.md](../../schema.md) を参照
- **MySQL 8.0+ を前提** — WITH RECURSIVE / ROW_NUMBER() OVER の利用に必須

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups/:id/members`

#### リクエスト仕様

| フィールド          | 型              | 必須 | 説明                                                                                                                                            |
| ------------------- | --------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | integer (path)  | ✓    | 親グループ ID（正の整数）                                                                                                                       |
| `limit`             | integer (query) | —    | 取得件数上限。1〜500（デフォルト: 500）                                                                                                         |
| `offset`            | integer (query) | —    | 取得開始位置。0 以上（デフォルト: 0）                                                                                                           |
| `q`                 | string (query)  | —    | 検索キーワード。**親 + 全子孫メンバーを対象**に search_key の双方向 LIKE 絞り込み                                                               |
| `exclude_group_ids` | string (query)  | —    | 除外するグループ ID をコンマ区切りで指定（例: `28,29`）。指定なし or 空文字は除外なし（全員返す）。「自グループを除外」時は親グループ ID も含む |

#### バリデーション一覧

| #   | 対象フィールド      | ルール                                                       | エラー時の挙動  |
| --- | ------------------- | ------------------------------------------------------------ | --------------- |
| 1   | `id`                | 整数に変換できること                                         | 400 Bad Request |
| 2   | `id`                | 1 以上（正の整数）であること                                 | 400 Bad Request |
| 3   | `id`                | DB 上に該当グループが存在すること                            | 404 Not Found   |
| 4   | `limit`             | 指定される場合は整数に変換できること                         | 400 Bad Request |
| 5   | `limit`             | 指定される場合は 1 以上 500 以下であること                   | 400 Bad Request |
| 6   | `offset`            | 指定される場合は整数に変換できること                         | 400 Bad Request |
| 7   | `offset`            | 指定される場合は 0 以上であること                            | 400 Bad Request |
| 8   | `exclude_group_ids` | 各要素が整数に変換できること                                 | 400 Bad Request |
| 9   | `exclude_group_ids` | 各要素が 1 以上の正の整数であること                          | 400 Bad Request |
| —   | `exclude_group_ids` | 対象グループの子孫でない無関係な ID は無視（エラーにしない） | —               |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `GET /api/v1/groups/:id/members`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

```
1. 開始
2. パスパラメータ id を取得してパースする
   - パース失敗または 0 以下 → 400 Bad Request {"message": "given param is not valid"} → 終了
3. クエリ limit / offset / q をパース・バリデーションする
   - 整数でない / 範囲外 → 400 Bad Request {"message": "given param is not valid"} → 終了
4. exclude_group_ids クエリパラメータをパースする
   - 空文字または未指定 → excludeGroupIDs = nil（除外なし）→ 次へ
   - コンマ区切りで分割し各要素を uint64 に変換する
   - 変換失敗または 0 以下の値 → 400 Bad Request {"message": "given param is not valid"} → 終了
5. メンバー一覧取得をサービス層に委譲する（excludeGroupIDs を追加引数として渡す）
6. サービス層で id / limit の範囲を再確認する
   - 範囲外 → 400 Bad Request → 終了
7. 親グループの存在を確認する
   - 存在しない → 404 Not Found {"message": "your requested item is not found"} → 終了
8. 自身 + 全子孫の (group_id, depth, root_child_id) 集合を WITH RECURSIVE で構築する
   - 自身を depth=0（root_child_id = 親自身の id）、直子 depth=1（root_child_id = 直子 id）、孫 depth=2 ... と展開する
9. WITH RECURSIVE の user_sources CTE 内に除外フィルターを適用する
   - excludeGroupIDs が nil → WHERE 句を追加しない（全件対象）
   - excludeGroupIDs が非空 → WHERE d.root_child_id NOT IN (?, ?, ...) を追加
   - 複数のサブグループ経由で所属するユーザーは、少なくとも 1 つの非除外パスがあれば表示される
10. 集合内 group_id をキーに group_members JOIN users で全候補行を取得する
    - 同一 user の root_child_id ごとの最小 depth を user_sources として集約する
    - 同一 user の全 source_group（root_child_id + groups.name）を `JSON_ARRAYAGG(... ORDER BY min_depth ASC, root_child_id ASC)` で配列として集約する（FE が `source_groups[0]` を最浅祖先として利用するため順序を保証する）
11. q が指定されている場合は users.search_key の双方向 LIKE 絞り込みを適用する
12. 重複排除後の件数を total として確定する（q・exclude_group_ids 適用後の件数。COUNT(*) OVER() はウィンドウ関数のため追加 COUNT クエリ不要）
13. 結果を min_depth ASC → user.id ASC でソートし、limit / offset を適用する
14. source_groups の各 group_id に対応する groups.name を JOIN groups で解決する
    - DB エラー → 500 Internal Server Error {"message": "internal server error"} → 終了
15. 200 OK + { members: [{id, uuid, first_name, last_name, source_groups: [{group_id, group_name}]}], total } を返す → 終了
```

### 主要設計判断（BE）

- 戻り値型は `domain.GroupMember`（`ID uint64` + `UUID string` + `FirstName string` + `LastName string` + `SourceGroups []SourceGroup`）を `domain/group.go` に定義する
- `domain.SourceGroup` は `GroupID uint64` + `GroupName string` のペアで複数所属元を表す
- 既存 `domain.User` は変更しない（user パッケージ側への波及を避ける）
- `GroupRepository.ListGroupMembers` / `GroupService.ListGroupMembers` / `groupMemberListResponse.Members` の型を `[]domain.GroupMember` に統一する
- WITH RECURSIVE + JSON_ARRAYAGG を 1 クエリで実行し、アプリ層の集約を避ける
- `source_groups` の各 `group_name` は BE 側で必ず JOIN groups により名前解決した値を返す（FE 側のフォールバック表示は持たない）
- `exclude_group_ids` のフィルターは `user_sources` CTE 段階（集計前）に `WHERE d.root_child_id NOT IN (...)` で適用する。これにより `total` のカウントも自動的にフィルター後の実数になる
- `NOT IN ()` は MySQL でエラーになるため、`excludeGroupIDs` が空の場合は WHERE 句を追加しない
- 動的プレースホルダは `fmt.Sprintf` + `strings.Join` パターン（既存の `AddGroupMembers` と同じ方式）で構築する
- 対象グループの子孫でない無関係な ID を渡した場合は `root_child_id` に一致しないため自然に無視される。バリデーションは行わない
- `parseCommaSeparatedUint64` 関数を `params.go` に追加してパース処理を共通化する

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### エンドポイント: `GET /api/v1/groups/:id/members`

```
1. 開始
2. GroupDetailContent コンポーネントがマウントされる
   - checkedSubgroupIds: Set<number> と excludeDirectMembers: boolean の state を初期化する
3. useGroupDetail から subgroups を取得し、useEffect で checkedSubgroupIds を全サブグループ ID で初期化する
   - subgroups は非同期取得のため useEffect で初期化する
4. useMemberList フックが動作する（excludeGroupIds を引数として受け取る）
   - GET /api/v1/groups/:id/members?limit=100&offset=0 を送信する（初期時は exclude_group_ids なし）
   - レスポンス受信
     - 成功（200）→ 取得したメンバー一覧（source_groups: [{group_id, group_name}] 配列を含む）と total をキャッシュする → MemberList を 4 列のテーブル形式で表示する
     - 失敗（4xx・5xx）→ エラーメッセージを画面に表示する → 終了
5. Subgroups セクションの表示
   - 各サブグループカードの左側にチェックボックスをレンダリングする（デフォルト: checked）
   - ユーザーがチェックを変更 → onSubgroupToggle コールバックを呼ぶ → GroupDetailContent の checkedSubgroupIds を更新する
6. MemberList の表示
   - テーブル列: □選択 / uuid / 姓名 / 所属元
   - ヘッダー内（検索ボックス右下）に「自グループを除外」チェックボックスをレンダリングする（デフォルト: unchecked）
   - 「所属元」列: source_groups に親グループ id が含まれる場合は「自グループ」を表示、それ以外は source_groups[0].group_name を表示
   - □選択（チェックボックス）セル: 親直属（source_groups に親 id が含まれる）の行のみ表示。子孫由来の行はセルを空にする
   - 子孫由来行の onMemberClick / 削除アクションは無効（クリックでも詳細遷移しない）
7. GroupDetailContent でフィルター変化を検知する（300ms デバウンス）
   - 除外 ID リストを組み立てる
     - checkedSubgroupIds に含まれない subgroup ID を収集する
     - excludeDirectMembers が true の場合、親グループ ID を追加する
   - コンマ区切り文字列に変換して excludeGroupIds を確定する
   - 300ms 経過後に clearMemberListCache() を呼びキャッシュリセットする
   - useMemberList フックが refreshKey 変化で API を再フェッチする
8. 「全選択」チェックボックスの判定
   - 親直属メンバー数 = members の中で source_groups に親 id が含まれる行の数
   - selectedIds.size === 親直属メンバー数 のとき全選択状態とする（子孫由来は計算対象外）
9. ユーザーが検索キーワードを入力する
   - 300ms デバウンス後にキャッシュをクリアして offset=0 でリセットする
   - GET /api/v1/groups/:id/members?limit=100&offset=0&q={keyword} を送信する
   - 結果は親 + 全子孫を対象に絞り込まれて返るので、手順 4 と同様に表示する → 終了
10. 無限スクロール
    - センチネル要素が viewport に入り lastBatchSize === 100 のとき
    - GET /api/v1/groups/:id/members?limit=100&offset=N&exclude_group_ids=N,M を送信する
    - 同じ exclude_group_ids を維持したまま追加取得する
11. subgroups の再フェッチ発生時（サブグループ追加・削除後）
    - useEffect で checkedSubgroupIds を全サブグループ ID で全リセットする
    - MemberList も clearMemberListCache() 経由で再フェッチされる（既存の refetch 連携）
```

---

## 確認ステップ 5-3: ファイル配置

**原則: 関与した全ファイルを列挙し、役割は具体的に書く。**

### sample-api

| 対応ステップ | パス                                                   | 役割                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5-1          | `sample-api/internal/rest/params.go`                   | `parseCommaSeparatedUint64(s string) ([]uint64, error)` を追加。空文字列は nil を返し、不正な値は `ErrBadParamInput` を返す                                                                                                                                                                                                                                                                                                        |
| 5-2          | `sample-api/domain/group.go`                           | `GroupMember`（`ID`, `UUID`, `FirstName`, `LastName`, `SourceGroups []SourceGroup`）と `SourceGroup`（`GroupID uint64`, `GroupName string`）を定義                                                                                                                                                                                                                                                                                 |
| 5-2          | `sample-api/group/service.go`                          | `GroupRepository.ListGroupMembers(ctx, groupID, excludeGroupIDs []uint64, q, limit, offset) ([]domain.GroupMember, int, error)` の IF（消費側宣言）と `GroupService.ListGroupMembers` ロジック                                                                                                                                                                                                                                     |
| 5-5          | `sample-api/group/service_test.go`                     | Service ユニットテスト（最浅祖先採用・source 配列・q フィルター・total 計算・excludeGroupIDs フィルターを含む）                                                                                                                                                                                                                                                                                                                    |
| 5-2          | `sample-api/group/mocks/group_repository_mock.go`      | `ListGroupMembers` mock（`excludeGroupIDs []uint64` を受け取り `[]domain.GroupMember` を返す）                                                                                                                                                                                                                                                                                                                                     |
| 5-2, 5-4     | `sample-api/internal/rest/group.go`                    | `ListGroupMembersHandler`（`exclude_group_ids` をパースしサービスへ渡す）・`GroupService.ListGroupMembers(ctx, groupID, excludeGroupIDs []uint64, q, limit, offset) ([]domain.GroupMember, int, error)` の IF・`groupMember` 型の `SourceGroups []sourceGroup` を JSON `source_groups` として返す・`getStatusCode` の `ErrBadParamInput` / `ErrNotFound` / `ErrInternalServerError` マッピングを利用                               |
| 5-5          | `sample-api/internal/rest/group_test.go`               | Handler ユニットテスト（`source_groups` フィールドのアサーション・`excludeGroupIDs` フィルターケースを含む）                                                                                                                                                                                                                                                                                                                       |
| 5-2          | `sample-api/internal/rest/mocks/group_service_mock.go` | `GroupService.ListGroupMembers` mock（`excludeGroupIDs []uint64` を受け取り `[]domain.GroupMember` を返す）                                                                                                                                                                                                                                                                                                                        |
| 5-2, 5-3     | `sample-api/internal/repository/mysql/group.go`        | `ListGroupMembers` に `excludeGroupIDs []uint64` を追加。`WITH RECURSIVE`（自身 + 全子孫の (group_id, depth, root_child_id) 集合構築）+ `JSON_ARRAYAGG(... ORDER BY min_depth ASC, root_child_id ASC)` で source_groups 配列集約（先頭が最浅祖先になるよう順序保証）+ q 絞り込み + `WHERE d.root_child_id NOT IN (...)` 条件分岐（空時は WHERE なし）+ min_depth ASC → user.id ASC ソート + limit/offset 適用までを 1 クエリで完結 |

### sample-front

| 対応ステップ | パス                                                                                | 役割                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5-2-FE       | `sample-front/src/entities/group/model/group-member.ts`                             | `GroupMember` 型（`id`, `uuid`, `first_name`, `last_name`, `source_groups: Array<{ group_id: number; group_name: string }>`）を定義。`isDirectMember` ユーティリティ関数を追加                                                                                                                                                                                                                                                                                                       |
| 5-2-FE       | `sample-front/src/pages/group-detail/api/fetch-group-members.ts`                    | `FetchGroupMembersParams` に `exclude_group_ids?: string` を追加。URLSearchParams 組み立て時に条件分岐で追加する                                                                                                                                                                                                                                                                                                                                                                     |
| 5-2-FE       | `sample-front/src/pages/group-detail/model/useMemberList.ts`                        | `useMemberList` の引数に `excludeGroupIds?: number[]` を追加。`doFetch` / `doFetchMore` 呼び出し時に現在の `excludeGroupIds` をコンマ区切り文字列に変換して `fetchGroupMembers` に渡す。再フェッチは `clearMemberListCache()` 経由の `refreshKey` 変化でのみ起動する（`excludeGroupIds` 変化自体はトリガーにならない）                                                                                                                                                               |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/GroupDetailContent.tsx`                     | `useSubgroupFilter` フックから `excludeGroupIds` / `excludeDirectMembers` / `toggleSubgroup` を取得。`useDebouncedMemberFilter` で debounce 済みの `debouncedExcludeGroupIds` を `MemberList` に渡す。`SubgroupFilterChips` に `excludeGroupIds` / `toggleSubgroup` を渡す。`MemberList` に `excludeDirectMembers` / `onExcludeDirectMembersChange` を渡す                                                                                                                           |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/SubgroupManagementSheet.tsx`                | `checkedSubgroupIds: Set<number>` / `onSubgroupToggle: (id: number, checked: boolean) => void` props を追加。各カード行の左側に Radix `Checkbox` を追加（`checked={checkedSubgroupIds.has(sg.id)}`）                                                                                                                                                                                                                                                                                 |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/MemberList.tsx`                             | テーブルに「所属元」列を追加。`source_groups.some(sg => sg.group_id === groupId) ? '自グループ' : source_groups[0].group_name`。チェックボックスセルは親直属のみ表示・子孫由来は空セル。`SkeletonMemberRow` の `colSpan` を +1 し、所属元列のスケルトンセルを追加。「全選択」判定を親直属メンバー数基準に変更。`excludeDirectMembers: boolean` / `onExcludeDirectMembersChange: (value: boolean) => void` props を追加。検索ボックス右下に「自グループを除外」チェックボックスを追加 |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/MemberList.styles.ts`                       | `tableHeaderCellSource` / `tableCellSource` のスタイル定数を追加。「自グループを除外」チェックボックス周辺のレイアウトスタイルを追加                                                                                                                                                                                                                                                                                                                                                 |
| 5-5          | `sample-front/src/pages/group-detail/ui/__tests__/MemberList.test.tsx`              | 「所属元」列ヘッダーの確認・親直属 / 子孫由来の表示分岐・チェックボックス表示制御・全選択判定（親直属基準）・onMemberClick 制御テスト。「自グループを除外」チェックボックスの初期値・コールバック・表示制御テストを追加                                                                                                                                                                                                                                                              |
| 5-5          | `sample-front/src/pages/group-detail/ui/__tests__/SubgroupManagementSheet.test.tsx` | 全サブグループのチェックボックスデフォルト checked 状態・onSubgroupToggle コールバック確認テストを追加                                                                                                                                                                                                                                                                                                                                                                               |
| 5-5          | `sample-front/src/pages/group-detail/model/__tests__/useMemberList.test.ts`         | フックユニットテスト（マウント時 API 呼び出し・エラー・検索デバウンス・clearMemberListCache 再フェッチ・無限スクロール・fetchMoreError）                                                                                                                                                                                                                                                                                                                                             |

> DB スキーマ変更なし。`group_relations` テーブル定義・制約・FK の詳細は [plans/schema.md](../../schema.md) を参照。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/groups/:id/members`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "members": [
    {
      "id": 1,
      "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "first_name": "太郎",
      "last_name": "山田",
      "source_groups": [{ "group_id": 10, "group_name": "Engineering" }]
    },
    {
      "id": 5,
      "uuid": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
      "first_name": "花子",
      "last_name": "佐藤",
      "source_groups": [{ "group_id": 11, "group_name": "Frontend Team" }]
    }
  ],
  "total": 250,
  "duplicate_count": 3
}
```

#### フィールド仕様

| フィールド                             | 型               | 説明                                                                                                    |
| -------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `members[]`                            | array            | 重複排除後のメンバー一覧（最大 `limit` 件、デフォルト 500、FE は 100）。並び順: depth ASC → user.id ASC |
| `members[].id`                         | integer (uint64) | ユーザー ID                                                                                             |
| `members[].uuid`                       | string           | ユーザー UUID                                                                                           |
| `members[].first_name`                 | string           | 名                                                                                                      |
| `members[].last_name`                  | string           | 姓                                                                                                      |
| `members[].source_groups`              | array            | 所属元グループ一覧。ユーザーが複数サブグループ経由で所属する場合に複数要素を含む                        |
| `members[].source_groups[].group_id`   | integer (uint64) | 所属元グループ ID。`:id` と一致する場合は親直属                                                         |
| `members[].source_groups[].group_name` | string           | 所属元グループ名（BE 側で必ず JOIN groups により解決済み）                                              |
| `total`                                | integer          | `q` および `exclude_group_ids` 適用かつ重複排除後の総件数（`members[]` のページサイズに依存しない）     |
| `duplicate_count`                      | integer          | 複数のサブグループ経由で重複所属するユーザーの件数（`SUM(JSON_LENGTH(source_groups)) OVER() - COUNT(*) OVER()` で算出） |

#### 補足

- `q` フィルター適用後、結果が 0 件のときは `members: []` / `total: 0` を返す（404 にしない）
- 親グループ自体は `members[]` の対象に含まれない（あくまでメンバー一覧。グループ階層構造の情報は含めない）
- `source_groups` 配列は各ユーザーが属するルート直子グループ（または親自身）ごとに要素を持つ

### エラーケース一覧

| 条件                                       | 発生レイヤー                       | ステータス                | レスポンス                                          |
| ------------------------------------------ | ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可                      | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                             | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `limit` が整数でない / 1〜500 の範囲外     | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `offset` が整数でない / 0 未満             | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `exclude_group_ids` の要素が整数に変換不可 | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `exclude_group_ids` の要素が 1 未満        | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| 対象グループが存在しない                   | Service / Repository               | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー（再帰クエリ含む）                | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| ネットワークエラー                         | フロントエンド: API クライアント層 | —                         | エラーメッセージ表示                                |

### 使用するエラーセンチネル

- `ErrBadParamInput`（400）
- `ErrNotFound`（404）
- `ErrInternalServerError`（500）

### FE 挙動（フィルター関連）

| 状況                              | 挙動                                                           |
| --------------------------------- | -------------------------------------------------------------- |
| 全サブグループ + 自グループを除外 | members が 0 件 → 既存の空状態メッセージを表示                 |
| チェック変更直後                  | 300ms デバウンス中はチェック状態のみ変化し、API はまだ呼ばない |
| API エラー                        | 既存のエラー表示ロジックをそのまま使用                         |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/groups/:id/members`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                                                | 入力例                         | 期待結果                                                                                        |
| --- | -------- | --------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| 1   | 正常系   | 親直属 + 子孫サブグループメンバーを統合した一覧を取得する | `id=1`                         | 200 OK + 親直属（source_groups[0].group_id=1）と子孫由来メンバーが混在した members 配列 + total |
| 2   | 正常系   | サブグループなしのとき親直属のみが返る                    | `id=2`（子孫なし）             | 200 OK + 全 members の source_groups[0].group_id=2（自グループ扱い）                            |
| 3   | 正常系   | 親と子孫に重複所属するユーザーは親優先で 1 行             | `id=1`                         | 200 OK + 重複ユーザーは 1 行のみ・source_groups[0].group_id=1                                   |
| 4   | 正常系   | q フィルターが親 + 子孫全体に適用される                   | `id=1, q=Yamada`               | 200 OK + 該当メンバーのみ・total=該当件数                                                       |
| 5   | 正常系   | 並び順が depth ASC → user.id ASC                          | `id=1`                         | 200 OK + members[0..n] が階層順 → 同階層内 id 昇順                                              |
| 6   | 正常系   | source_groups 配列が JSON に含まれる                      | `id=1`                         | 200 OK + 各 member に source_groups 配列（group_id / group_name 要素）が存在                    |
| 7   | 異常系   | id が文字列                                               | `id=abc`                       | 400 Bad Request                                                                                 |
| 8   | 境界値   | id=0                                                      | `id=0`                         | 400 Bad Request                                                                                 |
| 9   | 境界値   | limit=501（上限超え）                                     | `limit=501`                    | 400 Bad Request                                                                                 |
| 10  | 境界値   | offset=-1（最小値未満）                                   | `offset=-1`                    | 400 Bad Request                                                                                 |
| 11  | 異常系   | 存在しないグループ ID                                     | `id=9999`                      | 404 Not Found                                                                                   |
| 12  | 例外処理 | service が ErrInternalServerError を返す                  | DB エラー                      | 500 Internal Server Error                                                                       |
| 13  | 正常系   | exclude_group_ids 未指定時は全件返す                      | `id=1`                         | 200 OK（excludeGroupIDs=nil で mock 呼び出し）                                                  |
| 14  | 正常系   | exclude_group_ids 指定時は除外グループのメンバーが消える  | `id=1&exclude_group_ids=28`    | 200 OK + Group 28 由来メンバーなし                                                              |
| 15  | 正常系   | exclude_group_ids に親 ID を含めると直属メンバーが消える  | `id=1&exclude_group_ids=1`     | 200 OK + 直属メンバーなし                                                                       |
| 16  | 正常系   | exclude_group_ids に複数 ID を指定できる                  | `id=1&exclude_group_ids=28,29` | 200 OK + Group 28・29 由来メンバーなし                                                          |
| 17  | 異常系   | exclude_group_ids に文字列が含まれる                      | `exclude_group_ids=abc`        | 400 Bad Request                                                                                 |
| 18  | 境界値   | exclude_group_ids に 0 が含まれる                         | `exclude_group_ids=0`          | 400 Bad Request                                                                                 |

> 既存 #1〜#12 ケースの `mock.On("ListGroupMembers", ...)` に `excludeGroupIDs` 引数（`[]uint64(nil)`）を追加して通す

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                                             | 入力例                         | 期待結果                                                               |
| --- | -------- | ------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------- |
| 19  | 正常系   | 親 + 全子孫を再帰で集約した結果を返す                  | `id=1`（孫含む 3 階層）        | members に 3 階層分のユーザーが depth 順で並ぶ・total = 重複排除後件数 |
| 20  | 正常系   | 親優先の重複排除が働く                                 | 親と子に同一 user_id           | members は 1 行のみ・source_groups[0].group_id = 親                    |
| 21  | 正常系   | 子孫由来は最浅祖先の group_id を source として採用     | 親→subA→subB の 3 階層         | subB のみに所属するユーザーの source_groups[0].group_id = subA の id   |
| 22  | 正常系   | q フィルター適用                                       | `id=1, q=Sato`                 | search_key にマッチするメンバーのみ・total = 該当件数                  |
| 23  | 正常系   | サブグループが空でも親直属メンバーが返る               | 子孫なし                       | members は親直属のみ・全行 source_groups[0].group_id = 親              |
| 24  | 正常系   | メンバーが 0 人のグループ                              | `id=1`（親も子孫も空）         | members=[] + total=0                                                   |
| 25  | 異常系   | 存在しないグループ ID                                  | `id=9999`                      | ErrNotFound                                                            |
| 26  | 境界値   | id=0（最小境界外）                                     | `id=0`                         | ErrBadParamInput                                                       |
| 27  | 境界値   | limit=0 / limit=501                                    | `limit=0` / `limit=501`        | ErrBadParamInput                                                       |
| 28  | 例外処理 | repository が DB エラーを返す                          | repo mock がエラーを返す       | ErrInternalServerError                                                 |
| 29  | 正常系   | excludeGroupIDs が nil のとき repository に nil を渡す | `excludeGroupIDs=nil`          | 全件返す（既存テストと同様）                                           |
| 30  | 正常系   | excludeGroupIDs を repository へ正しく伝播する         | `excludeGroupIDs=[]uint64{28}` | Repository が同じ引数で呼ばれる                                        |

> 既存 #19〜#28 ケースの `mock.On("ListGroupMembers", ...)` に `excludeGroupIDs` 引数（`[]uint64(nil)`）を追加して通す

**フロントエンドテスト** (`MemberList.test.tsx`):

| #   | 観点                 | テスト内容                                                                                   | 期待結果                                                                                         |
| --- | -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 31  | 列ヘッダー           | 「所属元」列ヘッダーが追加されている                                                         | `columnheader` ロールで「所属元」が取得できる（既存の uuid / 姓名 と並ぶ）                       |
| 32  | 表示分岐             | `source_groups.some(sg => sg.group_id === groupId)` が true のとき「自グループ」が表示される | 該当行の所属元セルに「自グループ」テキストが表示される                                           |
| 33  | 表示分岐             | `source_groups` に groupId が含まれないとき `source_groups[0].group_name` が表示される       | 該当行の所属元セルにサブグループ名が表示される                                                   |
| 34  | チェックボックス制御 | 親直属行のみチェックボックスが表示される                                                     | source_groups.some(sg => sg.group_id === groupId) の行は checkbox が描画され、それ以外は空にする |
| 35  | コールバック         | 親直属メンバー選択時に `onMemberClick` が呼ばれる                                            | 引数に source_groups 配列を含む GroupMember が渡る                                               |
| 36  | コールバック         | 子孫由来メンバー行ではクリックしても `onMemberClick` が呼ばれない                            | 子孫行で click しても `onMemberSelect` / `onMemberClick` が呼ばれない                            |
| 37  | 全選択判定           | 全選択チェックボックスは親直属メンバー数基準で判定される                                     | selectedIds.size === 親直属メンバー数 のとき checked 状態。子孫由来は計算対象外                  |
| 38  | スケルトン           | ローディング中のスケルトン行が 4 列構成で正しく描画される                                    | `colSpan` が 4 列構成に揃い、所属元列のスケルトンセルが描画される                                |
| 39  | テスト網羅           | メンバー名表示・空状態・検索・チェックボックスが `GroupMember` 型で通る                      | 全テストが GroupMember データで pass                                                             |
| 40  | 正常系               | 「自グループを除外」チェックボックスが初期値 unchecked で表示される                          | Checkbox が `checked=false` でレンダリングされる                                                 |
| 41  | 正常系               | チェックすると `onExcludeDirectMembersChange(true)` が呼ばれる                               | コールバックが true で呼ばれる                                                                   |
| 42  | 正常系               | `excludeDirectMembers=false` のとき「自グループを除外」チェックボックスが unchecked          | 表示は unchecked                                                                                 |
| 43  | 正常系               | `excludeDirectMembers=true` のとき「自グループを除外」チェックボックスが checked             | 表示は checked                                                                                   |
| 44  | 正常系               | 全エントリ除外時に既存の空メッセージが表示される                                             | 「メンバーはまだいません」等のメッセージが表示される                                             |

**SubgroupManagementSheet テスト** (`ui/__tests__/SubgroupManagementSheet.test.tsx`):

| #   | 観点   | テスト内容                                                                    | 期待結果                                         |
| --- | ------ | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| 45  | 正常系 | 全サブグループにチェックボックスがデフォルトで checked 状態で表示される       | 各カードに Checkbox が描画され `checked` が true |
| 46  | 正常系 | チェックを外すと `onSubgroupToggle` コールバックが該当 ID と false で呼ばれる | `onSubgroupToggle(28, false)` が呼ばれる         |

**フックユニットテスト** (`model/__tests__/useMemberList.test.ts`):

| #   | 観点           | テスト内容                                                                                | 期待結果                                                                                     |
| --- | -------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 47  | 正常系         | マウント時に API を呼び出し members と total をセットする                                 | members と total が正しくセットされ isLoading=false になる                                   |
| 48  | 異常系         | API エラー時に error をセットする                                                         | error にメッセージがセットされ members=[] になる                                             |
| 49  | 正常系         | 検索クエリを 300ms デバウンスしてから API を呼び出す                                      | デバウンス前は未呼び出し、300ms 後に q パラメータ付きで呼ばれる                              |
| 50  | 正常系         | 初期ローディング状態が true である                                                        | isLoading=true、members=[]、error=null                                                       |
| 51  | 正常系         | clearMemberListCache 呼び出し後に useMemberList が再フェッチする                          | 再フェッチが実行され最新データが返る                                                         |
| 52  | 正常系（無限） | members は cachedMembers の全件を返す                                                     | 全件（55 件）が即時返る                                                                      |
| 53  | 正常系（無限） | sentinel が visible になったら doFetchMore を呼ぶ（lastBatchSize === FETCH_LIMIT のとき） | 次 offset でフェッチされる                                                                   |
| 54  | 正常系（無限） | sentinel が visible になった後に追加データが表示される                                    | 既存 + 追加の全件が返る                                                                      |
| 55  | 異常系（無限） | 追加フェッチ失敗時に fetchMoreError がセットされ既存メンバーは維持される                  | fetchMoreError にメッセージがセットされ、既存メンバーが維持され、isFetchingMore=false になる |

> E2E テスト（Playwright）は `/e2e-gen` で改めて設計するため、この PRD には含めない。

---

## 最低要件

1. `GET /api/v1/groups/:id/members` が実装されており、メンバー一覧（id, uuid, first_name, last_name, source_groups[]）と total を返す
2. レスポンスは親グループ + 全子孫サブグループのメンバーを統合した結果になる（再帰）
3. 親 + 子孫に重複所属するユーザーは親優先で 1 行のみ返す
4. 子孫由来メンバーの所属元は親に最も近い祖先サブグループ（最浅祖先）の id / name とする
5. 親直属メンバーの source_groups[0].group_id は親自身の id と一致する
6. 並び順は depth ASC → user.id ASC である
7. q が指定された場合は親 + 全子孫メンバー全体に対して search_key の双方向 LIKE 絞り込みを適用する
8. total は q・exclude_group_ids 適用後・重複排除後の件数と一致する（members.length とは独立して全件件数）
9. `id` が整数でない / 0 以下の場合に 400 を返す
10. `limit` が 1〜500 の範囲外の場合に 400 を返す
11. `offset` が 0 未満の場合に 400 を返す
12. 対象グループが存在しない場合に 404 を返す
13. DB エラー時に 500 を返す
14. WITH RECURSIVE で「自身 + 全子孫」の (group_id, depth) 集合を構築する
15. ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY depth, group_id) で重複排除を DB 側で行う
16. JOIN groups で group_name を BE 側で解決する（FE のフォールバック表示は持たない）
17. 戻り値型は `domain.GroupMember`（`ID uint64` + `UUID string` + `FirstName string` + `LastName string` + `SourceGroups []SourceGroup`）であり、`domain/group.go` に新設する。既存 `domain.User` は変更しない
18. `GroupRepository.ListGroupMembers` / `GroupService.ListGroupMembers` / `groupMemberListResponse.Members` の型を `[]domain.GroupMember` に統一する
19. グループ詳細画面のメンバー一覧テーブルは `□選択 / uuid / 姓名 / 所属元` の 4 列構成
20. 「所属元」列は親直属 → 固定テキスト「自グループ」、子孫由来 → `source_groups[0].group_name` を表示する
21. □選択（チェックボックス）セルは親直属行のみ描画し、子孫由来行はセルを空にする
22. 子孫由来行の `onMemberClick` / 削除アクションは無効である
23. 「全選択」チェックボックスの判定は親直属メンバー数基準（`selectedIds.size === 親直属メンバー数`）で行う
24. `SkeletonMemberRow` の `colSpan` は 4 列構成に合わせ、所属元列のスケルトンセルを表示する
25. `useMemberList` フックは無限スクロール・q 検索・refetch をサポートする
26. サブグループの追加 / 削除コールバックから `useMemberList.refetch()` を呼ぶことで一覧を最新化する
27. MemberRow コンポーネントに `data-testid="member-row"` を維持する（E2E セレクター安定化）
28. `GET /api/v1/groups/:id/members` が `exclude_group_ids` クエリパラメータを受け付ける
29. `exclude_group_ids` に指定されたグループ ID を `root_child_id` として持つメンバーを DB 側で除外する
30. `total` は `exclude_group_ids` フィルター後の重複排除件数と一致する
31. `exclude_group_ids` が未指定 or 空文字の場合は既存の挙動（全件返す）と同じ
32. `exclude_group_ids` の要素が整数でない / 0 以下の場合に 400 を返す
33. 無関係な（子孫でない）グループ ID は無視しエラーにしない
34. 複数のサブグループ経由で所属するユーザーは、少なくとも 1 つの非除外パスがあれば表示される
35. `parseCommaSeparatedUint64` を `params.go` に置き、ハンドラのパース処理を共通化する
36. FE の `useMemberList` フックが `excludeGroupIds?: number[]` を引数に受け取り、API リクエストに反映する
37. `GroupDetailContent` が `checkedSubgroupIds` / `excludeDirectMembers` state を管理し、フィルター変化後 300ms デバウンスで再フェッチを起動する
38. Subgroups セクションの各カードにチェックボックスを表示する（デフォルト: checked）
39. Members セクションのヘッダー内に「自グループを除外」チェックボックスを表示する（デフォルト: unchecked）
40. 「自グループを除外」チェック時は親グループ ID を `exclude_group_ids` に含める
41. subgroups の再フェッチ（サブグループ追加・削除後）時は `checkedSubgroupIds` を全サブグループ ID で全リセットする
42. フィルター状態はページセッション中のみ保持し、リロードでリセットされる

---

## 対象外

- 認証・認可の追加実装（既存の AuthMiddleware で対応済み）
- 子孫由来メンバーへの操作（削除・編集・チェックボックス選択）
- サブグループへのメンバー追加 UI（親詳細から）
- WITH RECURSIVE のパフォーマンスチューニング（10 グループ・5 階層が上限のため問題化しにくい）
- E2E テスト（`/e2e-gen` フェーズで設計）
- DB スキーマ変更（既存 `groups` / `group_members` / `group_relations` / `users` のみで完結）
- 親グループ自体の情報をレスポンスに含める拡張（メンバー一覧に専念）
- `exclude_group_ids` の対象 ID が実際のサブグループかどうかの検証（無関係な ID は無視）
- フィルター状態の永続化（localStorage / DB 保存）
- BE での `excludeDirectMembers` 専用パラメータ（親 ID を `exclude_group_ids` に含めることで対応）
- サブグループの孫・曾孫を個別にフィルターする機能（直属サブグループ単位のみ）
