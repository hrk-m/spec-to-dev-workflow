# PRD: list-users

## 概要

| 項目         | 内容                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 機能名       | `list-users`                                                                                                                     |
| 目的         | アクティブなユーザー一覧をキーワード検索付きで取得し、テーブル形式（id / uuid / 姓名 列構成）で表示する                         |
| API          | `GET /api/v1/users`                                                                                                              |
| 認証         | 必要（AuthMiddleware）                                                                                                           |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                                                   |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/users`

#### リクエスト仕様

| フィールド | 型              | 必須 | 説明                                                     |
| ---------- | --------------- | ---- | -------------------------------------------------------- |
| `q`        | string (query)  | —    | 検索キーワード。`search_key LIKE '%q%'` で絞り込み       |
| `limit`    | integer (query) | —    | 取得件数上限。1〜500（デフォルト: 500）                  |
| `offset`   | integer (query) | —    | 取得開始位置。0 以上（デフォルト: 0）                    |

#### バリデーション一覧

| #   | 対象フィールド | ルール                                     | エラー時の挙動  |
| --- | -------------- | ------------------------------------------ | --------------- |
| 1   | `limit`        | 指定される場合は整数に変換できること       | 400 Bad Request |
| 2   | `limit`        | 指定される場合は 1 以上 500 以下であること | 400 Bad Request |
| 3   | `offset`       | 指定される場合は整数に変換できること       | 400 Bad Request |
| 4   | `offset`       | 指定される場合は 0 以上であること          | 400 Bad Request |

#### フロントエンド側バリデーション

なし（バックエンドが 400 を返すため、フロントエンドは API エラーとして処理する）

---

## 確認ステップ 5-2: 処理フロー

### エンドポイント: `GET /api/v1/users`

#### フロントエンド処理フロー

```
1. 開始
2. UsersPage コンポーネントがマウントされる
3. UsersPage → API クライアント: GET /api/v1/users?limit=100&offset=0 を送信
4. レスポンスは成功？
   - Yes（200）→
      5. 取得したユーザー一覧（最大 100 件）と total を state にキャッシュ
      6. テーブル形式で全件表示（thead: id / uuid / 姓名, tbody: 各ユーザー行）
      7. テーブル末尾にセンチネル要素を追加（IntersectionObserver で監視）
      8. 終了
   - No（4xx・5xx）→
      5. エラーメッセージを画面に表示
      6. 終了
9. センチネル要素が viewport に入る
10. lastBatchSize === 100 →
        isFetchingMore = true（テーブル末尾にスピナー表示）
        GET /api/v1/users?limit=100&offset=N を送信
        - 成功 → キャッシュに追加（全件表示）、isFetchingMore = false
        - 失敗 → isFetchingMore = false、テーブル末尾にエラーメッセージ表示
11. ユーザーが検索キーワードを入力
12. 300ms デバウンス後にキャッシュをクリアして
    GET /api/v1/users?limit=100&offset=0&q={keyword} を送信
13. 手順 4 と同様（キャッシュをクリアして再キャッシュ）
14. 検索結果が 0 件の場合
    - ヘッダーサブタイトルに "No users found" を表示
```

#### バックエンド処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/users）を受信
3. クエリパラメータ limit・offset・q を取得
4. limit のパース・バリデーション
   - 未指定の場合 → デフォルト値 500 を使用
   - 整数でない / 1 未満 / 500 超の場合 → 400 Bad Request を返す
5. offset のパース・バリデーション
   - 未指定の場合 → デフォルト値 0 を使用
   - 整数でない / 0 未満の場合 → 400 Bad Request を返す
6. Service.ListUsers(ctx, q, limit, offset) を呼び出す
7. q を strings.TrimSpace で正規化
8. limit・offset をサービス層でも再検証（1〜500 / 0 以上）
   - 範囲外の場合 → domain.ErrBadParamInput を返す（→ 400 Bad Request）
9. Repository.ListUsers(ctx, q, limit, offset) を呼び出す
10. DB: SELECT COUNT(*) FROM users WHERE deleted_at IS NULL で total を取得
    - q が指定されている場合: AND search_key LIKE '%q%' を付加
    - total は q フィルターを適用したユーザー件数（q 未指定時は全ユーザー件数と等しい）
    - total = 0 の場合 → 空配列と 0 を返す
11. DB: SELECT id, uuid, first_name, last_name FROM users WHERE deleted_at IS NULL
      - q が指定されている場合: AND search_key LIKE '%q%'
      - ORDER BY id ASC
      - LIMIT :limit OFFSET :offset
12. DB エラーの場合
    - 500 Internal Server Error を返す
    - 終了
13. 成功の場合
    - 200 OK + userListResponse{ users, total } を返す
    - 終了
```

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md](../../schema.md) を参照。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/users`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "users": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "first_name": "太郎",
      "last_name": "山田"
    }
  ],
  "total": 42
}
```

※ `total`: `q` フィルターを適用したユーザー件数（`q` 未指定時は全ユーザー件数と等しい）
※ `users`: 今回のフェッチで返ったユーザー一覧（最大 `limit` 件）

### エラーケース一覧（バックエンド）

| 条件                                   | 発生レイヤー      | ステータス                | レスポンス                                  |
| -------------------------------------- | ----------------- | ------------------------- | ------------------------------------------- |
| `limit` が整数でない / 1〜500 の範囲外 | Handler           | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| `offset` が整数でない / 0 未満         | Handler           | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| DB エラー                              | Repository        | 500 Internal Server Error | `{ "message": "internal server error" }`    |

### エラーケース一覧（フロントエンド）

| 条件                      | 発生レイヤー            | ステータス | UI 挙動                              |
| ------------------------- | ----------------------- | ---------- | ------------------------------------ |
| 4xx / 5xx レスポンス      | API クライアント層      | —          | エラーメッセージを画面に表示         |
| ネットワークエラー        | API クライアント層      | —          | エラーメッセージを画面に表示         |
| 検索結果 0 件             | フロントエンド表示制御  | —          | "No users found" 表示                         |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/users`

**Handler テスト** (`internal/rest/user_test.go`):

| #   | 観点     | テスト内容                                 | 入力例                       | 期待結果                                      |
| --- | -------- | ------------------------------------------ | ---------------------------- | --------------------------------------------- |
| 1   | 正常系   | パラメータなしでユーザー一覧を取得         | クエリなし                   | 200 OK + users 配列（uuid 含む）+ total       |
| 2   | 正常系   | q ありで検索キーワードをサービスに渡す     | `q=山田`                     | 200 OK + 絞り込み結果                         |
| 3   | 正常系   | limit / offset 指定でページネーション      | `limit=10&offset=20`         | 200 OK + 対象範囲の結果                       |
| 4   | 正常系   | ユーザーが 0 件の場合                      | (空 DB)                      | 200 OK + users=[] + total=0                   |
| 5   | 異常系   | limit が整数でない                         | `limit=abc`                  | 400 Bad Request                               |
| 6   | 異常系   | limit = 0（1 未満）                        | `limit=0`                    | 400 Bad Request                               |
| 7   | 異常系   | limit = 501（500 超）                      | `limit=501`                  | 400 Bad Request                               |
| 8   | 異常系   | offset が整数でない                        | `offset=abc`                 | 400 Bad Request                               |
| 9   | 異常系   | offset < 0                                 | `offset=-1`                  | 400 Bad Request                               |
| 10  | 異常系   | service が DB エラーを返す                 | service モックがエラーを返す | 500 Internal Server Error                     |
| 11  | 外部依存 | Service をモックで切り分け                 | mockUserService              | Handler 単体でテスト可能                      |

※テストデータの `domain.User` リテラルに `UUID` フィールド（例: `"550e8400-e29b-41d4-a716-446655440001"`）を追加する。

**Service テスト** (`user/service_test.go`):

| #   | 観点     | テスト内容                               | 入力例                         | 期待結果                        |
| --- | -------- | ---------------------------------------- | ------------------------------ | ------------------------------- |
| 12  | 正常系   | repository.ListUsers 成功               | `limit=10, offset=0`           | users 配列（uuid 含む）+ total  |
| 13  | 異常系   | limit = 0（1 未満）                      | `limit=0`                      | ErrBadParamInput                |
| 14  | 異常系   | limit = 501（500 超）                    | `limit=501`                    | ErrBadParamInput                |
| 15  | 異常系   | offset < 0                               | `offset=-1`                    | ErrBadParamInput                |
| 16  | 正常系   | q を TrimSpace で正規化                  | `q="  山田  "`                 | `q="山田"` でリポジトリ呼び出し |
| 17  | 外部依存 | Repository をモックで切り分け            | mockUserRepository             | Service 単体でテスト可能        |

※テストデータの `domain.User` リテラルに `UUID` フィールドを追加する。

**フロントエンドテスト**:

`fetch-users.test.ts`:

| #   | 観点     | テスト内容                               | 入力例                  | 期待結果                             |
| --- | -------- | ---------------------------------------- | ----------------------- | ------------------------------------ |
| 18  | 正常系   | GET /api/v1/users を正しく呼び出す       | クエリなし              | apiFetch が正しい URL で呼ばれる     |
| 19  | 引数確認 | q・limit・offset がクエリパラメータに展開される | `{ q: "山田", limit: 10, offset: 0 }` | URL に `q=山田&limit=10&offset=0` が付く |

`useUserList.test.ts`:

| #   | 観点         | テスト内容                               | 入力例                        | 期待結果                             |
| --- | ------------ | ---------------------------------------- | ----------------------------- | ------------------------------------ |
| 20  | 正常系       | 初回ロードでユーザー一覧を取得・キャッシュ | マウント時                  | users 配列（uuid 含む）と total が state に入る |
| 21  | 検索         | 300ms デバウンスで再取得する              | `query = "山田"`              | 300ms 後に fetchUsers が呼ばれる     |
| 22  | 無限スクロール | センチネルが visible になったら追加フェッチが呼ばれる | lastBatchSize === FETCH_LIMIT | doFetchMore が呼ばれる |
| 23  | 0 件時       | isEmptyResult が true になる             | users=[]                      | `isEmptyResult === true`             |

※モックデータの `User` オブジェクトに `uuid: "..."` フィールドを追加する。

`UserList.test.tsx`:

| #   | 観点         | テスト内容                                             | 期待結果                                        |
| --- | ------------ | ------------------------------------------------------ | ----------------------------------------------- |
| 24  | スケルトン   | ローディング中にスケルトン行が表示される               | スケルトン行が DOM に存在する（テーブル行形式） |
| 25  | 一覧表示     | ユーザーの id・uuid・first_name・last_name が表示される | 各値がテーブルセルに表示される                 |
| 26  | 列ヘッダー   | id・uuid・姓名 の列ヘッダーが存在する                  | `columnheader` ロールで id / uuid / 姓名 が見つかる |
| 27  | アバターなし | アバターアイコン（頭文字円形）が存在しない             | アバター要素が DOM に存在しない                 |
| 28  | 0 件時       | "No users found" メッセージが表示される                | 空状態メッセージが DOM に存在する               |
| 29  | エラー時     | エラーメッセージが表示される                           | エラーカードが DOM に存在する                   |

---

## ファイル配置

### sample-api

| ファイル                                             | 役割                                          |
| ---------------------------------------------------- | --------------------------------------------- |
| `sample-api/domain/user.go`                          | User Entity（id, uuid, first_name, last_name）|
| `sample-api/user/service.go`                         | UserRepository interface・ListUsers 実装      |
| `sample-api/user/service_test.go`                    | Service ユニットテスト（UUID フィールド追加） |
| `sample-api/user/mocks/user_repository_mock.go`      | UserRepository の手動 mock                    |
| `sample-api/internal/rest/user.go`                   | HTTP Handler（ListUsers）                     |
| `sample-api/internal/rest/user_test.go`              | Handler ユニットテスト（UUID フィールド追加） |
| `sample-api/internal/rest/mocks/user_service_mock.go`| UserService の手動 mock                       |
| `sample-api/internal/repository/mysql/user.go`       | MySQL 実装（ListUsers・GetByID）              |

### sample-front

| ファイル                                                    | 役割                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `sample-front/src/app/App.tsx`                              | Sidebar に `onNavigate` を渡す配線                                                        |
| `sample-front/src/app/router.tsx`                           | `/users` ルート登録                                                                       |
| `sample-front/src/app/routes/GroupNavigationLayout.tsx`     | `/users` マッチ時に `<UsersPage />` を描画                                                |
| `sample-front/src/widgets/sidebar/ui/Sidebar.tsx`           | Groups / Users ナビゲーションボタン                                                       |
| `sample-front/src/pages/users/index.ts`                     | `UsersPage`・型定義の barrel export                                                       |
| `sample-front/src/pages/users/ui/UsersPage.tsx`             | ユーザー一覧ページコンポーネント（変更なし）                                              |
| `sample-front/src/pages/users/ui/UserList.tsx`              | テーブル形式ユーザー一覧コンポーネント（id / uuid / 姓名 列・アバターなし・検索・無限スクロール付き）|
| `sample-front/src/pages/users/ui/UserList.styles.ts`        | テーブル用スタイル定数（table / thead / tbody / tr / th / td）                            |
| `sample-front/src/pages/users/ui/__tests__/UserList.test.tsx`| テーブル形式向け更新（列ヘッダー確認・アバターなし確認・uuid 表示確認）                  |
| `sample-front/src/pages/users/api/fetch-users.ts`           | GET /api/v1/users 呼び出し（変更なし）                                                    |
| `sample-front/src/pages/users/model/user.ts`                | User 型に `uuid: string` を追加                                                           |
| `sample-front/src/pages/users/model/user-list.ts`           | `useUserList` フック（変更なし）                                                          |
| `sample-front/src/pages/users/model/__tests__/useUserList.test.ts` | モックデータに `uuid` フィールドを追加                                             |

---

## 最低要件

### バックエンド

1. `GET /api/v1/users` が実装されており、アクティブユーザー一覧（id, uuid, first_name, last_name）と total を返す
2. `deleted_at IS NULL` のユーザーのみを対象とする
3. `q` パラメータで `search_key LIKE '%q%'` の検索が動作する（前後スペースはトリム）
4. `limit`（1〜500、デフォルト: 500）・`offset`（0 以上、デフォルト: 0）によるページネーションが動作する
5. 範囲外の limit / offset は 400 を返す
6. DB エラー時は 500 を返す
7. `total` は `q` フィルターを適用したユーザー件数を返す（`q` 未指定時は全ユーザー件数と等しい）
8. handler・service テストの `domain.User` リテラルに `UUID` フィールドが含まれ、全テストが通過する

### フロントエンド

9. サイドバーに Groups / Users の 2 項目が表示され、Users クリックで `/users` へ遷移できる
10. `/users` でユーザー一覧画面（UserList コンポーネント）が表示される
11. マウント時に `GET /api/v1/users?limit=100&offset=0` を呼び出し、最大 100 件を取得してクライアントキャッシュする
12. 取得した全件をテーブル形式（`<table>` ベース）で即時表示する。テーブルヘッダー行に id・uuid・姓名 を表示する
13. 各ユーザー行（`<tr>`）に id・uuid・姓名（last_name + first_name）を表示する
14. アバターアイコン（姓名の頭文字円形アイコン）を表示しない
15. キャッシュが枯渇かつ `lastBatchSize === 100` のとき `offset+=100` で追加フェッチする
16. 追加フェッチ中はテーブル末尾にスピナーを表示する
17. 追加フェッチ失敗時はテーブル末尾にエラーメッセージを表示する（既存表示アイテムは維持）
18. キーワード入力後 300ms デバウンスで `q={keyword}` を付けて再取得する（キャッシュクリア・`offset=0` リセットあり）
19. データ取得中はスケルトンローディングをテーブル行形式（3 列）で表示する
20. 検索 0 件時は "No users found" をヘッダーサブタイトルに表示する
21. エラー時はエラーメッセージを表示する
22. `User` 型に `uuid: string` フィールドが含まれ、`useUserList.test.ts` のモックデータに `uuid` を追加して全テストが通過する
23. `UserList.test.tsx` がテーブル形式に対応し、列ヘッダー存在確認・アバターなし確認・uuid 表示確認を含む

---

## 対象外

- ユーザーの作成・更新・削除
- ソート順の変更（固定: users.id ASC）
