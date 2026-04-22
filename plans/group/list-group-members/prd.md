# PRD: list-group-members

## 概要

| 項目         | 内容                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| 機能名       | `list-group-members`                                                               |
| 目的         | グループに所属するメンバー一覧を取得する。グループ詳細画面のメンバー一覧表示に使用 |
| API          | `GET /api/v1/groups/:id/members`                                                   |
| 認証         | 必要（AuthMiddleware）                                                             |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                     |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups/:id/members`

#### リクエスト仕様

| フィールド | 型              | 必須 | 説明                                                           |
| ---------- | --------------- | ---- | -------------------------------------------------------------- |
| `id`       | integer (path)  | ✓    | グループの ID。正の整数                                        |
| `limit`    | integer (query) | —    | 取得件数上限。1〜500（デフォルト: 500）                        |
| `offset`   | integer (query) | —    | 取得開始位置。0 以上（デフォルト: 0）                          |
| `q`        | string (query)  | —    | 検索キーワード。search_key LIKE 検索（姓名・名姓順両方向対応） |

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

### エンドポイント: `GET /api/v1/groups/:id/members`

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
5. メンバー一覧取得をサービス層に委譲する
6. サービス層で id が 1 未満かどうかを確認する
   - 1 未満の場合 → 400 Bad Request → 終了
7. サービス層で limit の範囲を再確認する
   - 1 未満または 500 超の場合 → 400 Bad Request → 終了
8. グループの存在を確認する
   - 存在しない場合 → 404 Not Found { "message": "your requested item is not found" } → 終了
9. q フィルターを適用したメンバー件数を先行取得する
   - 件数が 0 の場合 → 200 OK + members=[] + total=0 → 終了
10. グループメンバー一覧を取得する（id ASC 順）
    - q が指定されている場合: search_key の部分一致で絞り込む
    - DB エラーの場合 → 500 Internal Server Error { "message": "internal server error" } → 終了
11. 200 OK + メンバー一覧と total を含む JSON を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### エンドポイント: `GET /api/v1/groups/:id/members`

凡例: `→` = 次の処理へ進む / 終了 = 処理終了

```
1. 開始
2. GroupDetailPage コンポーネントがマウントされる（useMemberList フックが動作する）
3. GET /api/v1/groups/:id/members?limit=100&offset=0 を送信する
4. レスポンス受信
   - 成功（200）→ 取得したメンバー一覧（最大 100 件）と total をキャッシュする → テーブル形式で全件表示する（thead: □選択 / id / 姓名） → テーブル末尾にセンチネル要素を設置する → 終了
   - 失敗（4xx・5xx）→ エラーメッセージを画面に表示する → 終了
5. センチネル要素が viewport に入る
   - lastBatchSize === 100 → テーブル末尾にスピナーを表示する
   - GET /api/v1/groups/:id/members?limit=100&offset=N を送信する
     - 成功 → キャッシュに追加して全件表示する → スピナーを非表示にする → 終了
     - 失敗 → スピナーを非表示にする → テーブル末尾にエラーメッセージを表示する → 終了
6. ユーザーが検索キーワードを入力する
   - 300ms デバウンス後にキャッシュをクリアして offset=0 でリセットする
   - GET /api/v1/groups/:id/members?limit=100&offset=0&q={keyword} を送信する
   - 手順 4 と同様に受信・表示する → 終了
```

---

## 確認ステップ 5-3: ファイル配置

**原則: 関与した全ファイルを列挙し、役割は具体的に書く。**

### sample-api

| 対応ステップ  | パス                                                        | 役割                                                                                                                            |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 5-2           | `sample-api/domain/group.go`                                | Group Entity・GroupMember Entity（id, first_name, last_name）                                                                   |
| 5-2           | `sample-api/group/service.go`                               | GroupRepository interface に ListGroupMembers 追加・ListGroupMembers ビジネスロジック                                           |
| 5-5           | `sample-api/group/service_test.go`                          | Service ユニットテスト（ListGroupMembers）                                                                                      |
| 5-5           | `sample-api/group/mocks/group_repository_mock.go`           | GroupRepository の手動 mock（ListGroupMembers 追加）                                                                            |
| 5-1, 5-2, 5-4 | `sample-api/internal/rest/group.go`                         | HTTP Handler（ListGroupMembers）・GroupService interface に ListGroupMembers 追加・ルート登録（GET /api/v1/groups/:id/members） |
| 5-5           | `sample-api/internal/rest/group_test.go`                    | Handler ユニットテスト（ListGroupMembers）                                                                                      |
| 5-5           | `sample-api/internal/rest/mocks/group_service_mock.go`      | GroupService の手動 mock（ListGroupMembers 追加）                                                                               |
| 5-3           | `sample-api/internal/repository/mysql/group.go`             | MySQL 実装（ListGroupMembers）                                                                                                  |
| 5-3           | `sample-api/db/migrate/20260403120000_create_tables.up.sql` | テーブル定義・マイグレーション（golang-migrate。groups / users / group_members を統合管理）                                     |

### sample-front

| 対応ステップ | パス                                                                   | 役割                                                                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/MemberList.tsx`                | メンバー一覧コンポーネント（`<table>` + `<thead>` + `<tbody>` 形式に変換。列構成: □選択 / id / 姓名。アバター削除。センチネル要素・スピナー・エラー表示維持）。MemberRow に `data-testid="member-row"` を付与 |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/MemberList.styles.ts`          | テーブル用スタイル定数を追加（`tableRoot`, `tableHeader`, `tableHeaderCell`, `tableHeaderCellCheckbox`, `tableRow`, `tableRowLast`, `tableCellId`, `tableCellName`, `tableCellCheckbox`）                     |
| 5-5          | `sample-front/src/pages/group-detail/ui/__tests__/MemberList.test.tsx` | テーブル形式向け更新（列ヘッダー確認・アバターなし確認）                                                                                                                                                      |
| 5-2-FE       | `sample-front/src/pages/group-detail/api/fetch-group-members.ts`       | GET /api/v1/groups/:id/members 呼び出し（limit=100 に変更）                                                                                                                                                   |
| 5-2-FE       | `sample-front/src/pages/group-detail/model/member-list.ts`             | メンバー一覧取得・無限スクロールカスタムフック（`useMemberList` を export。`displayedCount`・`isFetchingMore` 追加・ページネーション状態削除）                                                                |
| 5-5          | `e2e/tests/group-detail.spec.ts`                                       | メンバー 0 件検索 E2E テスト（ページネーション UI 非存在確認に更新）                                                                                                                                          |

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
      "first_name": "太郎",
      "last_name": "山田"
    }
  ],
  "total": 250
}
```

※ `total`: `q` フィルターを適用したメンバー件数（`q` 未指定時は全メンバー数と等しい）
※ `members`: 今回のフェッチで返ったメンバー一覧（最大 100 件。フロントエンドは limit=100 で送信）

### エラーケース一覧

| 条件                                   | 発生レイヤー                       | ステータス                | レスポンス                                          |
| -------------------------------------- | ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可                  | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                         | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `limit` が整数でない / 1〜500 の範囲外 | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `offset` が整数でない / 0 未満         | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| 対象グループが存在しない               | Service / Repository               | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー                              | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| ネットワークエラー                     | フロントエンド: API クライアント層 | —                         | エラーメッセージ表示                                |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/groups/:id/members`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                               | 入力例                      | 期待結果                      |
| --- | -------- | ---------------------------------------- | --------------------------- | ----------------------------- |
| 1   | 正常系   | メンバーが存在するグループのリスト取得   | `id=1, limit=500, offset=0` | 200 OK + members 配列 + total |
| 2   | 正常系   | パラメータなしでデフォルト値が適用される | `id=1`（パラメータなし）    | 200 OK + members=[] + total=0 |
| 3   | 正常系   | 検索キーワードでメンバー絞り込み         | `id=1, q=Yamada`            | 200 OK + 該当メンバーのみ     |
| 4   | 異常系   | id が文字列                              | `id=abc`                    | 400 Bad Request               |
| 5   | 境界値   | limit=501（上限超え）                    | `limit=501`                 | 400 Bad Request               |
| 6   | 境界値   | limit=0                                  | `limit=0`                   | 400 Bad Request               |
| 7   | 境界値   | offset=-1（最小値未満）                  | `offset=-1`                 | 400 Bad Request               |
| 8   | 異常系   | 存在しないグループ ID                    | `id=9999`                   | 404 Not Found                 |
| 9   | 例外処理 | DB 接続エラー発生時                      | DB mock がエラーを返す      | 500 Internal Server Error     |
| 10  | 境界値   | limit=500（上限）                        | `limit=500`                 | 200 OK                        |
| 11  | 境界値   | offset=0（最小値）                       | `offset=0`                  | 200 OK                        |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                             | 入力例                            | 期待結果               |
| --- | -------- | -------------------------------------- | --------------------------------- | ---------------------- |
| 12  | 正常系   | メンバーが存在するグループのリスト取得 | `id=1, limit=500, offset=0, q=""` | members + total        |
| 13  | 正常系   | 検索キーワードでメンバー絞り込み       | `id=1, q=Yamada`                  | 該当メンバーのみ       |
| 14  | 異常系   | 存在しないグループ ID                  | `id=9999`                         | ErrNotFound            |
| 15  | 境界値   | id=0（最小境界外）                     | `id=0`                            | ErrBadParamInput       |
| 16  | 境界値   | limit=0（下限未満）                    | `limit=0`                         | ErrBadParamInput       |
| 17  | 境界値   | limit=501（上限超え）                  | `limit=501`                       | ErrBadParamInput       |
| 18  | 例外処理 | Repository がエラーを返す              | repo mock がエラーを返す          | ErrInternalServerError |
| 19  | 正常系   | メンバーが 0 人のグループ              | `id=1`（返値が空）                | members=[] + total=0   |

**フロントエンドテスト** (`MemberList.test.tsx`):

| #   | 観点         | テスト内容                                                                           | 期待結果                                                     |
| --- | ------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 15  | 列ヘッダー   | `id`・`姓名` の列ヘッダーが存在する                                                  | `columnheader` ロールで `id` / `姓名` が取得できる           |
| 16  | アバターなし | アバターアイコン（イニシャル円形）が存在しない                                       | `MemberAvatar` に相当する要素が DOM に存在しない             |
| 17  | 既存テスト   | メンバー名表示・空状態・検索・チェックボックス等の既存テストがテーブル形式で通過する | 既存 19 ケースがテーブル形式（`<tr>` / `<td>`）対応で全 pass |

---

## 確認ステップ 5-6: E2E テストケース（Playwright）

### エンドポイント: メンバー一覧・検索 0 件時の UI 挙動

| #   | 観点   | テスト内容                                            | 操作手順                                                                    | 期待結果                                                |
| --- | ------ | ----------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | 正常系 | メンバー検索 0 件時に空状態メッセージが表示される     | `/groups/1` → networkidle → メンバー検索欄に `ZZZZNONEXISTENT` → 500ms 待機 | `"No members found."` が表示される                      |
| 2   | 正常系 | メンバー検索 0 件時にページネーション UI が存在しない | `/groups/1` → networkidle → メンバー検索欄に `ZZZZNONEXISTENT` → 500ms 待機 | Previous / Next ボタン・件数セレクタが DOM に存在しない |
| 3   | 正常系 | メンバー検索 0 件時にメンバー行が表示されない         | `/groups/1` → networkidle → メンバー検索欄に `ZZZZNONEXISTENT` → 500ms 待機 | `data-testid="member-row"` 要素が 0 件                  |

> **備考**: MemberRow コンポーネントに `data-testid="member-row"` を追加し、E2E テストのセレクターを安定化させる。`total` は API 側でフィルターなし全件数を返す設計のため、フロントエンドは `cachedMembers.length`（実際の取得件数）を使用して空状態表示・追加フェッチトリガーを制御する。

---

## 最低要件

1. `GET /api/v1/groups/:id/members` が実装されており、メンバー一覧（id, first_name, last_name）と total を返す
2. `users` テーブルが作成されている（id, first_name, last_name）
3. `group_members` テーブルが `user_id`（FK→users）を持つ構成に更新されている
4. `id` が整数でない / 0 以下の場合に 400 を返す
5. `limit` が 1〜500 の範囲外の場合に 400 を返す
6. 対象グループが存在しない場合に 404 を返す
7. `q` パラメータで search_key LIKE 検索が動作する（姓名・名姓順両方向対応）
8. 詳細ページにメンバー一覧が取得した全件で表示される（`displayedCount` による分割表示なし）
9. キャッシュが枯渇かつ `lastBatchSize === 100` のとき `offset+=100` で追加フェッチし、取得結果をキャッシュに追加して全件即時表示する
10. 追加フェッチ中はテーブル末尾にスピナーを表示する
11. 追加フェッチ失敗時はテーブル末尾にエラーメッセージを表示する（既存表示アイテムは維持）
12. メンバー検索で 0 件のとき、"No members found." を表示する
13. UI から Previous/Next ボタンおよび件数セレクタ（20/50/100）を削除する
14. `currentPage` / `totalPages` / `perPage` / `handlePerPageChange` の状態を削除する
15. MemberRow コンポーネントに `data-testid="member-row"` を付与し、E2E テストのセレクターを安定化させる
16. MemberList が `<table>` 形式（`<table>` + `<thead>` + `<tbody>`）で表示される
17. `<thead>` に空の `<th>`（チェックボックス列、`aria-label="選択"`）・`id`・`姓名` の 3 列ヘッダーが存在する
18. アバターアイコン（イニシャル円形）を表示しない（各メンバー行に `MemberAvatar` は使用しない）
19. テーブルヘッダーの `columnheader` ロールで `id` および `姓名` が取得できる
20. `MemberList.styles.ts` に UserList と同パターンのテーブル用スタイル定数が定義されている

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- メンバーの追加・削除
- ページネーション（サーバーサイド）— クライアントサイドページネーションのみ対応
