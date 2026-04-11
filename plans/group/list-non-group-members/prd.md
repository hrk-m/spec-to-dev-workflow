# PRD: list-non-group-members

## 概要

| 項目         | 内容                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------- |
| 機能名       | `list-non-group-members`                                                                       |
| 目的         | 指定グループに所属していないユーザー一覧を取得する。グループメンバー追加画面の候補一覧表示に使用 |
| API          | `GET /api/v1/groups/:id/non-members`                                                           |
| 認証         | 不要                                                                                           |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                 |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups/:id/non-members`

#### リクエスト仕様

| フィールド | 型              | 必須 | 説明                                                              |
| ---------- | --------------- | ---- | ----------------------------------------------------------------- |
| `id`       | integer (path)  | ✓    | グループの ID。正の整数                                           |
| `q`        | string (query)  | —    | 検索キーワード。`search_key LIKE '%q%'` で絞り込み               |
| `limit`    | integer (query) | —    | 取得件数上限。1〜500（デフォルト: 500）                          |
| `offset`   | integer (query) | —    | 取得開始位置。0 以上（デフォルト: 0）                            |

#### バリデーション一覧

| #   | 対象フィールド | ルール                                     | エラー時の挙動  |
| --- | -------------- | ------------------------------------------ | --------------- |
| 1   | `id`           | 整数に変換できること                       | 400 Bad Request |
| 2   | `id`           | 1 以上（正の整数）であること               | 400 Bad Request |
| 3   | `id`           | DB 上に該当グループが存在すること          | 404 Not Found   |
| 4   | `limit`        | 指定される場合は整数に変換できること       | 400 Bad Request |
| 5   | `limit`        | 指定される場合は 1 以上 500 以下であること | 400 Bad Request |
| 6   | `offset`       | 指定される場合は整数に変換できること       | 400 Bad Request |
| 7   | `offset`       | 指定される場合は 0 以上であること          | 400 Bad Request |

---

## 確認ステップ 5-2: バックエンド処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/groups/:id/non-members）を受信
3. パスパラメータ id を c.Param("id") で取得、クエリパラメータを取得
4. id を整数にパース
   - パース失敗の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
5. id < 1 の場合
   - 400 Bad Request { "message": "given param is not valid" } を返す
   - 終了
6. limit が指定されている場合はパース・バリデーション
   - 整数でない / 1 未満 / 500 超の場合 → 400 Bad Request
7. offset が指定されている場合はパース・バリデーション
   - 整数でない / 0 未満の場合 → 400 Bad Request
8. Service.ListNonGroupMembers(ctx, id, limit, offset, q) を呼び出す
9. service 層で groupID < 1 の場合 → ErrBadParamInput
10. service 層で limit < 1 または limit > 500 の場合 → ErrBadParamInput
11. Repository.GetByID(ctx, groupID) でグループ存在確認
    - 存在しない（ErrNotFound）→
       - 404 Not Found { "message": "your requested item is not found" } を返す
       - 終了
12. Repository.ListNonGroupMembers(ctx, groupID, limit, offset, q) を呼び出す
13. DB: SELECT COUNT(*) FROM users WHERE id NOT IN (SELECT user_id FROM group_members WHERE group_id = ?) AND deleted_at IS NULL
    - total: フィルターなしの未所属ユーザー全件数
    - total = 0 の場合 → 空配列と 0 を返す
14. DB: SELECT id, first_name, last_name FROM users WHERE id NOT IN (...) AND deleted_at IS NULL
    - q が指定されている場合: AND search_key LIKE '%q%'
    - ORDER BY id ASC
    - LIMIT :limit OFFSET :offset
15. DB エラーの場合
    - 500 Internal Server Error { "message": "internal server error" } を返す
    - 終了
16. 成功の場合
    - 200 OK + nonMemberListResponse を返す
    - 終了
```

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md](../../schema.md) を参照。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/groups/:id/non-members`

#### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "users": [
    {
      "id": 2,
      "first_name": "太郎",
      "last_name": "山田"
    }
  ],
  "total": 10
}
```

※ `total`: フィルターなしの未所属ユーザー全件数（`q` 適用前の COUNT）
※ `users`: 今回のフェッチで返ったユーザー一覧（最大 `limit` 件）

#### エラーケース一覧

| 条件                                   | 発生レイヤー      | ステータス                | レスポンス                                          |
| -------------------------------------- | ----------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可                  | Handler           | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                         | Handler           | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `limit` が整数でない / 1〜500 の範囲外 | Handler           | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `offset` が整数でない / 0 未満         | Handler           | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| 対象グループが存在しない               | Service / Repository | 404 Not Found          | `{ "message": "your requested item is not found" }` |
| DB エラー                              | Repository        | 500 Internal Server Error | `{ "message": "internal server error" }`            |

---

## 確認ステップ 5-5: ユニットテストケース

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点   | テスト内容                                     | 入力例                          | 期待結果                        |
| --- | ------ | ---------------------------------------------- | ------------------------------- | ------------------------------- |
| 1   | 正常系 | q なしで未所属ユーザー一覧を取得               | `id=1`                          | 200 OK + users 配列 + total     |
| 2   | 正常系 | q ありで search_key フィルタリング             | `id=1, q=Suzuki`                | 200 OK + 対象ユーザーのみ       |
| 3   | 正常系 | 全員グループ参加済みの場合（空配列）           | `id=1`（全員加入済み）          | 200 OK + users=[] + total=0     |
| 4   | 異常系 | 存在しないグループ ID                          | `id=9999`                       | 404 Not Found                   |
| 5   | 異常系 | id が文字列                                    | `id=abc`                        | 400 Bad Request                 |
| 6   | 異常系 | id が 0                                        | `id=0`                          | 400 Bad Request                 |
| 7   | 異常系 | limit が不正値（文字列）                       | `limit=abc`                     | 400 Bad Request                 |
| 8   | 異常系 | offset が負数                                  | `offset=-1`                     | 400 Bad Request                 |
| 9   | 異常系 | DB エラー                                      | service モックがエラーを返す    | 500 Internal Server Error       |
| 10  | 外部依存 | Service をモックで切り分け                   | MockGroupService                | Handler 単体でテスト可能        |

**Service テスト** (`group/service_test.go`):

| #   | 観点   | テスト内容                                        | 入力例                              | 期待結果                        |
| --- | ------ | ------------------------------------------------- | ----------------------------------- | ------------------------------- |
| 11  | 正常系 | q なしで未所属ユーザー一覧を取得                  | `groupID=1, limit=500, offset=0`    | users 配列 + total              |
| 12  | 正常系 | q ありでフィルタリング                            | `groupID=1, q=Tanaka`               | 該当ユーザーのみ + total        |
| 13  | 正常系 | 全員加入済みで空配列を返す                        | `groupID=1`（全員加入済み）         | users=[] + total=0              |
| 14  | 異常系 | 存在しないグループ ID                             | `groupID=9999`                      | ErrNotFound                     |
| 15  | 異常系 | groupID が 0                                      | `groupID=0`                         | ErrBadParamInput                |
| 16  | 異常系 | limit が 0                                        | `limit=0`                           | ErrBadParamInput                |
| 17  | 異常系 | limit が 501                                      | `limit=501`                         | ErrBadParamInput                |
| 18  | 異常系 | DB エラー                                         | repo モックがエラーを返す           | ErrInternalServerError          |
| 19  | 外部依存 | Repository をモックで切り分け                   | MockGroupRepository                 | Service 単体でテスト可能        |

---

## ファイル配置

| ファイル                                                        | 役割                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `sample-api/domain/user.go`                                     | User Entity（id, first_name, last_name）定義                       |
| `sample-api/group/service.go`                                   | GroupRepository interface に `ListNonGroupMembers` 追加・ビジネスロジック実装 |
| `sample-api/group/service_test.go`                              | Service ユニットテスト（ListNonGroupMembers）                      |
| `sample-api/group/mocks/group_repository_mock.go`               | GroupRepository の手動 mock（ListNonGroupMembers 追加）            |
| `sample-api/internal/rest/group.go`                             | HTTP Handler（ListNonGroupMembers）・GroupService interface 追加・ルート登録 |
| `sample-api/internal/rest/group_test.go`                        | Handler ユニットテスト（ListNonGroupMembers）                      |
| `sample-api/internal/rest/mocks/group_service_mock.go`          | GroupService の手動 mock（ListNonGroupMembers 追加）               |
| `sample-api/internal/repository/mysql/group.go`                 | MySQL 実装（ListNonGroupMembers）                                  |
| `sample-api/db/migrate/20260411120000_add_search_key_to_users.up.sql` | `users` テーブルへの `search_key` VIRTUAL GENERATED COLUMN 追加マイグレーション |

---

## 最低要件

1. `GET /api/v1/groups/:id/non-members` が実装されており、未所属ユーザー一覧（id, first_name, last_name）と total を返す
2. `users` テーブルの `deleted_at IS NULL` のユーザーのみを対象とする
3. `NOT IN` サブクエリで `group_members` に存在するユーザーを除外する
4. `q` パラメータで `search_key LIKE '%q%'` の検索が動作する（`search_key` は VIRTUAL GENERATED COLUMN）
5. `id` が整数でない / 0 以下の場合に 400 を返す
6. `limit` が 1〜500 の範囲外の場合に 400 を返す
7. 対象グループが存在しない場合に 404 を返す
8. `total` はフィルターなしの未所属ユーザー全件数（`q` 適用前の COUNT）
9. 全員加入済みの場合は `users=[]` + `total=0` を返す
10. レスポンスのキーは `users`（`domain.User` の配列）と `total`（int64）

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- メンバーの追加・削除（別エンドポイント）
- ソート順の変更（固定: users.id ASC）
