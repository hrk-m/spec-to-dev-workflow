# PRD: list-groups

## 概要

| 項目         | 内容                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 機能名       | `list-groups`                                                                                                                  |
| 目的         | グループをキーワード・offset 条件で絞り込んで一覧取得する。フロントエンドは 100 件ずつ取得してクライアントキャッシュで無限スクロール表示する |
| API          | `GET /api/v1/groups`                                                                                                           |
| 認証         | 必要（AuthMiddleware）                                                                                                         |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                                                 |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups`

#### リクエスト仕様

| フィールド | 型              | 必須 | 説明                                            |
| ---------- | --------------- | ---- | ----------------------------------------------- |
| `q`        | string (query)  | —    | 検索キーワード。name / description の LIKE 検索 |
| `limit`    | integer (query) | —    | 取得件数上限。1〜500（デフォルト: 500）         |
| `offset`   | integer (query) | —    | 取得開始位置。0 以上（デフォルト: 0）           |

#### バリデーション一覧

| #   | 対象フィールド | ルール                                     | エラー時の挙動  |
| --- | -------------- | ------------------------------------------ | --------------- |
| 1   | `limit`        | 指定される場合は整数に変換できること       | 400 Bad Request |
| 2   | `limit`        | 指定される場合は 1 以上 500 以下であること | 400 Bad Request |
| 3   | `offset`       | 指定される場合は整数に変換できること       | 400 Bad Request |
| 4   | `offset`       | 指定される場合は 0 以上であること          | 400 Bad Request |

---

## 確認ステップ 5-2: 処理フロー

### エンドポイント: `GET /api/v1/groups`

#### フロントエンド 処理フロー

```
1. 開始
2. HomePage コンポーネントがマウントされる
3. HomePage → API クライアント: GET /api/v1/groups?limit=100&offset=0 を送信
4. レスポンスは成功？
   - Yes（200）→
      5. 取得したグループ一覧（最大 100 件）と total を state にキャッシュ
      6. 取得した全件をリストに表示
      7. リスト末尾にセンチネル要素を追加（IntersectionObserver で監視）
      8. 終了
   - No（4xx・5xx）→
      5. エラーメッセージを画面に表示
      6. 終了
9. センチネル要素が viewport に入る
10. lastBatchSize === 100 →
        isFetchingMore = true（リスト末尾にスピナー表示）
        GET /api/v1/groups?limit=100&offset=N を送信
        - 成功 → キャッシュに追加（全件表示）、isFetchingMore = false
        - 失敗 → isFetchingMore = false、リスト末尾にエラーメッセージ表示
11. ユーザーが検索キーワードを入力
12. 300ms デバウンス後にキャッシュをクリアして
    GET /api/v1/groups?limit=100&offset=0&q={keyword} を送信
13. 手順 4 と同様（キャッシュをクリアして再キャッシュ）
```

#### バックエンド 処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/groups）を受信
3. クエリパラメータ（q / limit / offset）を取得
4. limit が指定されている場合はパース・バリデーション
   - 整数でない / 1 未満 / 500 超の場合 → 400 Bad Request
5. offset が指定されている場合はパース・バリデーション
   - 整数でない / 0 未満の場合 → 400 Bad Request
6. Service.ListGroups(ctx, q, limit, offset) を呼び出す
7. Repository.ListGroups(ctx, q, limit, offset) を呼び出す
8. DB: groups テーブルと group_members を LEFT JOIN してカウント・一覧を取得
   - q が指定されている場合: スペース区切りのトークンごとに AND 結合で絞り込む
     各トークン: `(g.name LIKE '%token%' OR g.description LIKE '%token%')`
   - LIMIT :limit OFFSET :offset
   - total: q フィルターを適用したグループ件数を COUNT で取得（`countFilteredGroups` が先行実行）
9. DB エラーの場合
   - 500 Internal Server Error { "message": "internal server error" } を返す
   - 終了
10. 成功の場合
    - 200 OK + `groupListResponse{Groups: groups, Total: total}` を返す（Handler ローカル型）
    - 終了
```

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md](../../schema.md) を参照。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/groups`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "groups": [
    {
      "id": 1,
      "name": "dev-team",
      "description": "developers",
      "member_count": 3
    }
  ],
  "total": 42
}
```

※ `total`: q フィルターを適用したグループ件数（`q` 未指定時は全グループ件数と等しい）
※ `groups`: 今回のフェッチで返ったグループ一覧（最大 100 件。フロントエンドは limit=100 で送信）

### エラーケース一覧

| 条件                             | 発生レイヤー                       | ステータス                | レスポンス                                  |
| -------------------------------- | ---------------------------------- | ------------------------- | ------------------------------------------- |
| `limit` が整数に変換不可         | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| `limit` が 1〜500 の範囲外       | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| `offset` が整数に変換不可        | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| `offset` が 0 未満               | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| DB エラー（COUNT / SELECT 失敗） | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`    |
| ネットワークエラー               | フロントエンド: API クライアント層 | —                         | エラーメッセージ表示                        |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/groups`

| #   | 観点     | テスト内容                               | 入力例                         | 期待結果                            |
| --- | -------- | ---------------------------------------- | ------------------------------ | ----------------------------------- |
| 1   | 正常系   | パラメータなしでデフォルト値が適用される | `（パラメータなし）`           | 200 OK / limit=500, offset=0 で取得 |
| 2   | 正常系   | q なしで全件取得                         | `?limit=20&offset=0`           | 200 OK / 全グループ + total         |
| 3   | 正常系   | q キーワードで絞り込み                   | `?q=dev&limit=20`              | 200 OK / マッチしたグループ         |
| 4   | 正常系   | offset 指定で次の 500 件を取得           | `?limit=500&offset=500`        | 200 OK / 次の 500 件                |
| 5   | 正常系   | グループが 0 件の場合                    | `（グループが存在しない状態）` | 200 OK / groups=[] + total=0        |
| 6   | 異常系   | limit が整数でない                       | `?limit=abc`                   | 400 Bad Request                     |
| 7   | 境界値   | limit=500（上限）                        | `?limit=500`                   | 200 OK                              |
| 8   | 境界値   | limit=501（上限超え）                    | `?limit=501`                   | 400 Bad Request                     |
| 9   | 境界値   | limit=0                                  | `?limit=0`                     | 400 Bad Request                     |
| 10  | 境界値   | offset=0（最小値）                       | `?offset=0`                    | 200 OK                              |
| 11  | 境界値   | offset=-1（最小値未満）                  | `?offset=-1`                   | 400 Bad Request                     |
| 12  | 例外処理 | DB エラー時に 500 を返す                 | DB mock がエラーを返す         | 500 Internal Server Error           |
| 13  | 外部依存 | Service をモックで切り分け               | mockGroupService               | Handler 単体でテスト可能            |
| 14  | 外部依存 | Repository をモックで切り分け            | mockGroupRepository            | Service 単体でテスト可能            |

---

## 確認ステップ 5-6: E2E テストケース（Playwright）

### エンドポイント: グループ一覧・検索 0 件時の UI 挙動

| #   | 観点     | テスト内容                                                       | 操作手順                                                                  | 期待結果                                                                 |
| --- | -------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | 正常系   | 検索 0 件時にヘッダーラベルが "No groups found" に変わる         | `/` → networkidle → 検索欄に `ZZZZNONEXISTENT` → 500ms 待機               | `"No groups found"` がサブタイトルに表示される                           |
| 2   | 正常系   | 検索 0 件時に空状態メッセージが表示される                        | `/` → networkidle → 検索欄に `ZZZZNONEXISTENT` → 500ms 待機               | `"No groups matched that search."` が表示される                          |
| 3   | 正常系   | 検索 0 件時にページネーション UI が存在しない                    | `/` → networkidle → 検索欄に `ZZZZNONEXISTENT` → 500ms 待機               | Previous / Next ボタン・件数セレクタが DOM に存在しない                  |

> **備考**: ページネーション UI は削除済み。無限スクロールへの変更後も 0 件検索時の空状態メッセージ表示は維持する。

---

## ファイル配置

### sample-api

| ファイル                                                    | 役割                                                                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `sample-api/domain/group.go`                                | Group Entity（id, name, description, member_count）・GroupMember Entity                                                       |
| `sample-api/group/service.go`                               | GroupRepository interface の ListGroups シグネチャ変更・ビジネスロジック更新                                                  |
| `sample-api/group/service_test.go`                          | Service ユニットテスト更新                                                                                                    |
| `sample-api/group/mocks/group_repository_mock.go`           | GroupRepository の手動 mock 更新（ListGroups シグネチャ変更）                                                                 |
| `sample-api/internal/rest/group.go`                         | HTTP Handler（ListGroups）・GroupService interface・Handler ローカルの `groupListResponse` / `groupMemberListResponse` 型定義 |
| `sample-api/internal/rest/group_test.go`                    | Handler ユニットテスト更新                                                                                                    |
| `sample-api/internal/rest/mocks/group_service_mock.go`      | GroupService の手動 mock 更新（ListGroups シグネチャ変更）                                                                    |
| `sample-api/internal/repository/mysql/group.go`             | MySQL 実装更新（page → offset 変換削除、q パラメータ名変更）                                                                  |
| `sample-api/db/migrate/20260403120000_create_tables.up.sql` | テーブル定義・マイグレーション（golang-migrate）                                                                              |

### sample-front

| ファイル                                            | 役割                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `sample-front/src/pages/home/api/fetch-groups.ts`   | GET /api/v1/groups 呼び出し（limit=100 に変更）                                                                  |
| `sample-front/src/pages/home/model/useGroupList.ts` | グループ一覧取得・無限スクロールカスタムフック（`displayedCount`・`isFetchingMore`・IntersectionObserver 対応）   |
| `sample-front/src/pages/home/ui/GroupList.tsx`      | グループ一覧コンポーネント（ページネーション UI 削除・センチネル要素追加・リスト末尾スピナー／エラー表示）        |
| `e2e/tests/group-list.spec.ts`                      | グループ 0 件検索 E2E テスト（ヘッダーラベル・ページネーション UI 非存在・空状態メッセージの確認）               |

---

## 最低要件

1. `GET /api/v1/groups` が `q`（任意）・`limit`（任意、デフォルト 500, 1〜500）・`offset`（任意、デフォルト 0, 0 以上）を受け付ける
2. `search`・`page` パラメータは削除する（後方互換は提供しない）
3. `limit` が 1〜500 の範囲外の場合に 400 を返す
4. `offset` が 0 未満の場合に 400 を返す
5. `q` が指定された場合、グループの name / description で LIKE 検索が動作する
6. レスポンスが `{ "groups": [...], "total": N }` 形式を返す（`pagination` オブジェクト廃止）
7. `total` は `q` フィルターを適用したグループ件数を返す（`q` 未指定時は全グループ件数と等しい）
8. 該当グループが 0 件の場合は空配列を返す（エラーにしない）
9. DB エラーは 500 で返す
10. フロントエンドが 100 件ずつ取得 → クライアントキャッシュ → 無限スクロール表示する
11. 取得した全件をリストに即時表示する（`displayedCount` による分割表示なし）
12. キャッシュが枯渇かつ `lastBatchSize === 100` のとき `offset+=100` で追加フェッチする
13. 追加フェッチ中はリスト末尾にスピナーを表示する
14. 追加フェッチ失敗時はリスト末尾にエラーメッセージを表示する（既存表示アイテムは維持）
15. 検索で 0 件のとき、ヘッダーサブタイトルに "No groups found" を表示する
16. フロントエンドの UI から Previous/Next ボタンおよび件数セレクタ（20/50/100）を削除する
17. `currentPage` / `totalPages` / `perPage` / `handlePerPageChange` の状態を削除する
18. IntersectionObserver の jsdom mock を `setup.ts` に追加する
19. 検索変更時にキャッシュをクリアし `offset=0` でリセットする

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- グループの作成・更新・削除
- ソート順の変更（固定: id DESC）
