# PRD: list-non-group-members

## 概要

| 項目         | 内容                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| 機能名       | `list-non-group-members`                                                                           |
| 目的         | 指定グループに所属していないユーザー一覧を取得し、グループメンバー追加画面で無限スクロール表示する |
| API          | `GET /api/v1/groups/:id/non-members`                                                               |
| 認証         | 必要（AuthMiddleware）                                                                             |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                     |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups/:id/non-members`

#### リクエスト仕様

| フィールド | 型              | 必須 | 説明                                               |
| ---------- | --------------- | ---- | -------------------------------------------------- |
| `id`       | integer (path)  | ✓    | グループの ID。正の整数                            |
| `q`        | string (query)  | —    | 検索キーワード。`search_key LIKE '%q%'` で絞り込み |
| `limit`    | integer (query) | —    | 取得件数上限。1〜500（デフォルト: 500）            |
| `offset`   | integer (query) | —    | 取得開始位置。0 以上（デフォルト: 0）              |

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

### エンドポイント: `GET /api/v1/groups/:id/non-members`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

#### バックエンド処理フロー

```
1. 開始
2. パスパラメータ id を取得してパースする
   - パース失敗または 0 以下の場合 → 400 Bad Request { "message": "given param is not valid" } → 終了
3. limit が指定されている場合はパースしてバリデーションを行う
   - 整数でない / 1 未満 / 500 超の場合 → 400 Bad Request { "message": "given param is not valid" } → 終了
4. offset が指定されている場合はパースしてバリデーションを行う
   - 整数でない / 0 未満の場合 → 400 Bad Request { "message": "given param is not valid" } → 終了
5. 非メンバー一覧取得をサービス層に委譲する
6. サービス層で groupID が 1 未満かどうかを確認する
   - 1 未満の場合 → 400 Bad Request → 終了
7. サービス層で limit の範囲を再確認する
   - 1 未満または 500 超の場合 → 400 Bad Request → 終了
8. グループの存在を確認する
   - 存在しない場合 → 404 Not Found { "message": "your requested item is not found" } → 終了
9. グループに所属していない削除済みでないユーザーの件数を先行取得する
   - q が指定されている場合: search_key の部分一致で絞り込む
   - 件数が 0 の場合 → 200 OK + users=[] + total=0 → 終了
10. 非メンバーユーザー一覧を取得する（id ASC 順）
    - q が指定されている場合: search_key の部分一致で絞り込む
    - DB エラーの場合 → 500 Internal Server Error { "message": "internal server error" } → 終了
11. 200 OK + ユーザー一覧と total を含む JSON を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### エンドポイント: `GET /api/v1/groups/:id/non-members`

凡例: `→` = 次の処理へ進む / 終了 = 処理終了

```
1. 開始
2. AddMemberSheet コンポーネントがマウントされる（useNonMemberList フックが動作する）
3. GET /api/v1/groups/:id/non-members?limit=100&offset=0 を送信する
4. レスポンス受信
   - 成功（200）→ 取得したユーザー一覧（最大 100 件）と total をキャッシュする → テーブル形式で全件表示する（thead: □選択 / 姓名） → テーブル末尾にセンチネル要素を設置する → 終了
   - 失敗（4xx・5xx）→ エラーメッセージを画面に表示する → 終了
5. センチネル要素が viewport に入る
   - lastBatchSize === 100 → テーブル末尾にスピナーを表示する
   - GET /api/v1/groups/:id/non-members?limit=100&offset=N を送信する
     - 成功 → キャッシュに追加して全件表示する → スピナーを非表示にする → 終了
     - 失敗 → スピナーを非表示にする → テーブル末尾にエラーメッセージを表示する → 終了
6. ユーザーが検索キーワードを入力する
   - 300ms デバウンス後にキャッシュをクリアして offset=0 でリセットする
   - GET /api/v1/groups/:id/non-members?limit=100&offset=0&q={keyword} を送信する
   - 手順 4 と同様に受信・表示する → 終了
```

---

## 確認ステップ 5-3: ファイル配置

**原則: 関与した全ファイルを列挙し、役割は具体的に書く。**

### sample-api

| 対応ステップ  | パス                                                                  | 役割                                                                            |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 5-2           | `sample-api/domain/user.go`                                           | User Entity（id, first_name, last_name）定義                                    |
| 5-2           | `sample-api/group/service.go`                                         | GroupRepository interface に `ListNonGroupMembers` 追加・ビジネスロジック実装   |
| 5-5           | `sample-api/group/service_test.go`                                    | Service ユニットテスト（ListNonGroupMembers）                                   |
| 5-5           | `sample-api/group/mocks/group_repository_mock.go`                     | GroupRepository の手動 mock（ListNonGroupMembers 追加）                         |
| 5-1, 5-2, 5-4 | `sample-api/internal/rest/group.go`                                   | HTTP Handler（ListNonGroupMembers）・GroupService interface 追加・ルート登録    |
| 5-5           | `sample-api/internal/rest/group_test.go`                              | Handler ユニットテスト（ListNonGroupMembers）                                   |
| 5-5           | `sample-api/internal/rest/mocks/group_service_mock.go`                | GroupService の手動 mock（ListNonGroupMembers 追加）                            |
| 5-3           | `sample-api/internal/repository/mysql/group.go`                       | MySQL 実装（ListNonGroupMembers）                                               |
| 5-3           | `sample-api/db/migrate/20260411120000_add_search_key_to_users.up.sql` | `users` テーブルへの `search_key` VIRTUAL GENERATED COLUMN 追加マイグレーション |

### sample-front

| 対応ステップ | パス                                                                       | 役割                                                                                                                                                                                                               |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/AddMemberSheet.tsx`                | メンバー追加シート。ユーザーリスト部分を `<table>` + `<thead>` + `<tbody>` 形式に変換。列構成: □選択 / 姓名。UserAvatar 削除。センチネル要素・スピナー・エラー表示・一括追加機能を維持                             |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/AddMemberSheet.styles.ts`          | テーブル用スタイル定数（`tableRoot`, `tableHeader`, `tableHeaderCell`, `tableHeaderCellCheckbox`, `tableRow`, `tableRowLast`, `tableCellCheckbox`, `tableCellName` 等）。エラーテキストは `appColors.error` を使用 |
| 5-5          | `sample-front/src/pages/group-detail/ui/__tests__/AddMemberSheet.test.tsx` | テーブル形式向け更新（列ヘッダー確認・アバターなし確認）                                                                                                                                                           |
| 5-2-FE       | `sample-front/src/pages/group-detail/api/fetch-non-members.ts`             | GET /api/v1/groups/:id/non-members 呼び出し                                                                                                                                                                        |
| 5-2-FE       | `sample-front/src/pages/group-detail/model/useNonMemberList.ts`            | 非メンバー一覧取得・無限スクロールカスタムフック（変更なし）                                                                                                                                                       |

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

※ `total`: `q` フィルターを適用した未所属ユーザー件数（`q` 未指定時は全未所属ユーザー件数と等しい）
※ `users`: 今回のフェッチで返ったユーザー一覧（最大 `limit` 件）

#### エラーケース一覧

| 条件                                   | 発生レイヤー         | ステータス                | レスポンス                                          |
| -------------------------------------- | -------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可                  | Handler              | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                         | Handler              | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `limit` が整数でない / 1〜500 の範囲外 | Handler              | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `offset` が整数でない / 0 未満         | Handler              | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| 対象グループが存在しない               | Service / Repository | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー                              | Repository           | 500 Internal Server Error | `{ "message": "internal server error" }`            |

---

## 確認ステップ 5-5: ユニットテストケース

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                           | 入力例                       | 期待結果                    |
| --- | -------- | ------------------------------------ | ---------------------------- | --------------------------- |
| 1   | 正常系   | q なしで未所属ユーザー一覧を取得     | `id=1`                       | 200 OK + users 配列 + total |
| 2   | 正常系   | q ありで search_key フィルタリング   | `id=1, q=Suzuki`             | 200 OK + 対象ユーザーのみ   |
| 3   | 正常系   | 全員グループ参加済みの場合（空配列） | `id=1`（全員加入済み）       | 200 OK + users=[] + total=0 |
| 4   | 異常系   | 存在しないグループ ID                | `id=9999`                    | 404 Not Found               |
| 5   | 異常系   | id が文字列                          | `id=abc`                     | 400 Bad Request             |
| 6   | 異常系   | id が 0                              | `id=0`                       | 400 Bad Request             |
| 7   | 異常系   | limit が不正値（文字列）             | `limit=abc`                  | 400 Bad Request             |
| 8   | 異常系   | offset が負数                        | `offset=-1`                  | 400 Bad Request             |
| 9   | 異常系   | DB エラー                            | service モックがエラーを返す | 500 Internal Server Error   |
| 10  | 外部依存 | Service をモックで切り分け           | MockGroupService             | Handler 単体でテスト可能    |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                       | 入力例                           | 期待結果                 |
| --- | -------- | -------------------------------- | -------------------------------- | ------------------------ |
| 11  | 正常系   | q なしで未所属ユーザー一覧を取得 | `groupID=1, limit=500, offset=0` | users 配列 + total       |
| 12  | 正常系   | q ありでフィルタリング           | `groupID=1, q=Tanaka`            | 該当ユーザーのみ + total |
| 13  | 正常系   | 全員加入済みで空配列を返す       | `groupID=1`（全員加入済み）      | users=[] + total=0       |
| 14  | 異常系   | 存在しないグループ ID            | `groupID=9999`                   | ErrNotFound              |
| 15  | 異常系   | groupID が 0                     | `groupID=0`                      | ErrBadParamInput         |
| 16  | 異常系   | limit が 0                       | `limit=0`                        | ErrBadParamInput         |
| 17  | 異常系   | limit が 501                     | `limit=501`                      | ErrBadParamInput         |
| 18  | 異常系   | DB エラー                        | repo モックがエラーを返す        | ErrInternalServerError   |
| 19  | 外部依存 | Repository をモックで切り分け    | MockGroupRepository              | Service 単体でテスト可能 |

**フロントエンドテスト** (`AddMemberSheet.test.tsx`):

| #   | 観点         | テスト内容                                                   | 期待結果                                       |
| --- | ------------ | ------------------------------------------------------------ | ---------------------------------------------- |
| 20  | 列ヘッダー   | `姓名` の列ヘッダーが存在する                                | `columnheader` ロールで `姓名` が取得できる    |
| 21  | アバターなし | アバターアイコン（イニシャル円形）が存在しない               | `UserAvatar` に相当する要素が DOM に存在しない |
| 22  | 選択ヘッダー | 選択列ヘッダーが存在する                                     | `th[aria-label="選択"]` が DOM に存在する      |
| 23  | 既存テスト   | 既存 14 ケースがテーブル形式（`<tr>` / `<td>`）対応で全 pass | 既存テスト全通過                               |

---

## 最低要件

### バックエンド

1. `GET /api/v1/groups/:id/non-members` が実装されており、未所属ユーザー一覧（id, first_name, last_name）と total を返す
2. `users` テーブルの `deleted_at IS NULL` のユーザーのみを対象とする
3. `NOT IN` サブクエリで `group_members` に存在するユーザーを除外する
4. `q` パラメータで `search_key LIKE '%q%'` の検索が動作する（`search_key` は VIRTUAL GENERATED COLUMN）
5. `id` が整数でない / 0 以下の場合に 400 を返す
6. `limit` が 1〜500 の範囲外の場合に 400 を返す
7. 対象グループが存在しない場合に 404 を返す
8. `total` は `q` フィルターを適用した未所属ユーザー件数（`q` 未指定時は全未所属ユーザー件数と等しい）
9. 全員加入済みの場合は `users=[]` + `total=0` を返す
10. レスポンスのキーは `users`（`domain.User` の配列）と `total`（int）

### フロントエンド

1. マウント時に `GET /api/v1/groups/:id/non-members?limit=100&offset=0` を呼び出し、最大 100 件を取得してクライアントキャッシュする
2. 取得した全件をリストに即時表示する（`displayedCount` による分割表示なし）
3. キャッシュが枯渇かつ `lastBatchSize === 100` のとき `offset+=100` で追加フェッチする
4. 追加フェッチ中はリスト末尾にスピナーを表示する
5. 追加フェッチ失敗時はリスト末尾にエラーメッセージを表示する（既存表示アイテムは維持）
6. キーワード入力後 300ms デバウンスで再取得する（キャッシュクリア・`offset=0` リセットあり）
7. UI から Previous/Next ボタンおよび件数セレクタ（20/50/100）を削除する
8. `currentPage` / `totalPages` / `perPage` / `handlePerPageChange` の状態を削除する
9. AddMemberSheet のユーザーリストが `<table>` 形式（`<table>` + `<thead>` + `<tbody>`）で表示される
10. `<thead>` に空の `<th>`（チェックボックス列、`aria-label="選択"`）と `<th>姓名</th>` の 2 列ヘッダーが存在する
11. アバターアイコン（イニシャル円形）を表示しない（各ユーザー行に `UserAvatar` は使用しない）
12. `columnheader` ロールで `姓名` が取得できる
13. `AddMemberSheet.styles.ts` に MemberList と同パターンのテーブル用スタイル定数が定義されている

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- メンバーの追加・削除（別エンドポイント）
- ソート順の変更（固定: users.id ASC）
