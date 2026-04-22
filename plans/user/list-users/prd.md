# PRD: list-users

## 概要

| 項目         | 内容                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| 機能名       | `list-users`                                                                                            |
| 目的         | アクティブなユーザー一覧をキーワード検索付きで取得し、テーブル形式（id / uuid / 姓名 列構成）で表示する |
| API          | `GET /api/v1/users`                                                                                     |
| 認証         | 必要（AuthMiddleware）                                                                                  |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                          |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/users`

#### リクエスト仕様

| フィールド | 型              | 必須 | 説明                                               |
| ---------- | --------------- | ---- | -------------------------------------------------- |
| `q`        | string (query)  | —    | 検索キーワード。`search_key LIKE '%q%'` で絞り込み |
| `limit`    | integer (query) | —    | 取得件数上限。1〜500（デフォルト: 500）            |
| `offset`   | integer (query) | —    | 取得開始位置。0 以上（デフォルト: 0）              |

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

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `GET /api/v1/users`

凡例: → は条件分岐・次ステップ、終了 はフロー終端を示す

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/users）を受信
3. クエリパラメータ limit・offset・q を取得
4. limit のパース・バリデーション
   - 未指定の場合 → デフォルト値 500 を使用
   - 整数に変換できない、または 1 未満・500 超の場合 → 400 Bad Request を返す → 終了
5. offset のパース・バリデーション
   - 未指定の場合 → デフォルト値 0 を使用
   - 整数に変換できない、または 0 未満の場合 → 400 Bad Request を返す → 終了
6. ユーザー一覧取得サービスを呼び出す
7. limit・offset をサービス層でも再検証（1〜500 / 0 以上）
   - 範囲外の場合 → 400 Bad Request を返す → 終了
8. q を前後スペースのトリムで正規化
9. ユーザー一覧をリポジトリ経由で取得
10. DB からフィルター適用済みのユーザー総件数を取得
    - q が指定されている場合: search_key LIKE '%q%' で絞り込み
    - 総件数が 0 の場合 → 空配列と 0 を返す → 終了
11. DB から対象ページのユーザー行を取得
    - q が指定されている場合: search_key LIKE '%q%' で絞り込み
    - id 昇順でソート
    - limit・offset を適用
12. DB エラーの場合 → 500 Internal Server Error を返す → 終了
13. 成功の場合 → 200 OK + ユーザー一覧と総件数を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

凡例: → は条件分岐・次ステップ、終了 はフロー終端を示す

```
1. 開始
2. UsersPage コンポーネントがマウントされ、UserList コンポーネントを描画する
3. useUserList フックが初期化される
   - キャッシュエントリが存在する場合 → キャッシュのユーザー一覧・総件数・fetchedOffset・lastBatchSize を復元する
   - キャッシュエントリが存在しない場合 → ローディング状態でスケルトン行を表示する
4. GET /api/v1/users?limit=100&offset=0 を送信する
   - 成功（200）→
      5. 取得したユーザー一覧（最大 100 件）と総件数をキャッシュに保存する
      6. テーブル形式（thead: id / uuid / 姓名, tbody: 各ユーザー行）で全件表示する
      7. テーブル末尾にセンチネル要素を配置し IntersectionObserver で監視する
      8. 終了
   - 失敗（4xx・5xx・ネットワークエラー）→
      5. エラーカードを画面に表示する → 終了
9. センチネル要素が viewport に入り、かつ直前バッチサイズが 100 件（FETCH_LIMIT）と等しい場合
   - 追加フェッチ中フラグを true にしてテーブル末尾にスピナーを表示する
   - GET /api/v1/users?limit=100&offset=N を送信する
      - 成功 → 重複を除いて既存キャッシュに追加表示する → 追加フェッチ中フラグを false にする → 終了
      - 失敗 → 追加フェッチ中フラグを false にし、テーブル末尾にエラーメッセージを表示する（既存表示アイテムは維持）→ 終了
10. ユーザーが検索キーワードを入力する
11. 300ms デバウンス後に処理を分岐する
    - キーワードが空になった場合 → キャッシュエントリが存在すれば復元して表示する。キャッシュがなければ offset=0 で GET /api/v1/users?limit=100&offset=0 を送信する → 終了
    - キーワードが入力された場合 → ユーザー一覧をリセットし、offset=0 で
      GET /api/v1/users?limit=100&offset=0&q={keyword} を送信する
      - 成功 → 新しいユーザー一覧と総件数をセットして表示する → 終了
      - 失敗 → エラーカードを表示する → 終了
12. 検索結果が 0 件かつローディング完了の場合
    - ページサブタイトル（userCountLabel）に "No users found" を表示する → 終了
```

---

## 確認ステップ 5-3: ファイル配置

### sample-api

| 対応ステップ  | パス                                                  | 役割                                                         |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| 5-1, 5-2, 5-4 | `sample-api/internal/rest/user.go`                    | HTTP Handler（ListUsers）・UserService interface・ルート登録 |
| 5-2           | `sample-api/domain/user.go`                           | User Entity（id, uuid, first_name, last_name）               |
| 5-2           | `sample-api/user/service.go`                          | UserRepository interface・ListUsers ビジネスロジック         |
| 5-2           | `sample-api/internal/repository/mysql/user.go`        | MySQL 実装（ListUsers・CountByIDs・GetByUUID）                  |
| 5-5           | `sample-api/internal/rest/user_test.go`               | Handler ユニットテスト                                       |
| 5-5           | `sample-api/internal/rest/mocks/user_service_mock.go` | UserService の手動 mock                                      |
| 5-5           | `sample-api/user/service_test.go`                     | Service ユニットテスト                                       |
| 5-5           | `sample-api/user/mocks/user_repository_mock.go`       | UserRepository の手動 mock                                   |

### sample-front

| 対応ステップ | パス                                                               | 役割                                                                                    |
| ------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 5-2-FE       | `sample-front/src/app/router.tsx`                                  | `/users` ルート登録                                                                     |
| 5-2-FE       | `sample-front/src/pages/users/index.ts`                            | `UsersPage`・型定義の barrel export                                                     |
| 5-2-FE       | `sample-front/src/pages/users/ui/UsersPage.tsx`                    | ユーザー一覧ページコンポーネント                                                        |
| 5-2-FE       | `sample-front/src/pages/users/ui/UserList.tsx`                     | テーブル形式ユーザー一覧コンポーネント（id / uuid / 姓名 列・検索・無限スクロール付き） |
| 5-2-FE       | `sample-front/src/pages/users/ui/UserList.styles.ts`               | テーブル用スタイル定数                                                                  |
| 5-2-FE       | `sample-front/src/pages/users/api/fetch-users.ts`                  | GET /api/v1/users 呼び出し                                                              |
| 5-2-FE       | `sample-front/src/pages/users/model/user.ts`                       | User 型・UsersResponse 型・FetchUsersParams 型定義                                      |
| 5-2-FE       | `sample-front/src/pages/users/model/user-list.ts`                  | `useUserList` フック・キャッシュ管理                                                    |
| 5-5          | `sample-front/src/pages/users/ui/__tests__/UserList.test.tsx`      | UserList コンポーネントのテスト                                                         |
| 5-5          | `sample-front/src/pages/users/api/__tests__/fetch-users.test.ts`   | fetchUsers 関数のテスト                                                                 |
| 5-5          | `sample-front/src/pages/users/model/__tests__/useUserList.test.ts` | useUserList フックのテスト                                                              |

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

| 条件                                   | 発生レイヤー | ステータス                | レスポンス                                  |
| -------------------------------------- | ------------ | ------------------------- | ------------------------------------------- |
| `limit` が整数でない / 1〜500 の範囲外 | Handler      | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| `offset` が整数でない / 0 未満         | Handler      | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| DB エラー                              | Repository   | 500 Internal Server Error | `{ "message": "internal server error" }`    |

### エラーケース一覧（フロントエンド）

| 条件                 | 発生レイヤー           | ステータス | UI 挙動                      |
| -------------------- | ---------------------- | ---------- | ---------------------------- |
| 4xx / 5xx レスポンス | API クライアント層     | —          | エラーメッセージを画面に表示 |
| ネットワークエラー   | API クライアント層     | —          | エラーメッセージを画面に表示 |
| 検索結果 0 件        | フロントエンド表示制御 | —          | "No users found" 表示        |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/users`

**Handler テスト** (`internal/rest/user_test.go`):

| #   | 観点   | テスト内容                                           | 入力例                       | 期待結果                                |
| --- | ------ | ---------------------------------------------------- | ---------------------------- | --------------------------------------- |
| 1   | 正常系 | デフォルトパラメータでユーザー一覧を取得             | `limit=500&offset=0`         | 200 OK + users 配列（uuid 含む）+ total |
| 2   | 正常系 | パラメータなし（デフォルト適用）でユーザー一覧を取得 | クエリなし                   | 200 OK + users=[] + total=0             |
| 3   | 正常系 | q ありで検索キーワードをサービスに渡す               | `q=Suzuki`                   | 200 OK + サービスに q が渡る            |
| 4   | 正常系 | limit / offset 指定でページネーション                | `limit=10&offset=20`         | 200 OK + 対象範囲の結果                 |
| 5   | 正常系 | ユーザーが 0 件の場合                                | (空 DB)                      | 200 OK + users=[] + total=0             |
| 6   | 異常系 | limit が整数でない                                   | `limit=abc`                  | 400 Bad Request                         |
| 7   | 異常系 | limit = 0（1 未満）                                  | `limit=0`                    | 400 Bad Request                         |
| 8   | 異常系 | limit = 501（500 超）                                | `limit=501`                  | 400 Bad Request                         |
| 9   | 異常系 | offset が整数でない                                  | `offset=abc`                 | 400 Bad Request                         |
| 10  | 異常系 | offset < 0                                           | `offset=-1`                  | 400 Bad Request                         |
| 11  | 異常系 | service が DB エラーを返す                           | service モックがエラーを返す | 500 Internal Server Error               |

**Service テスト** (`user/service_test.go`):

| #   | 観点   | テスト内容                                               | 入力例                    | 期待結果                                    |
| --- | ------ | -------------------------------------------------------- | ------------------------- | ------------------------------------------- |
| 12  | 正常系 | q を前後スペースのトリムで正規化してリポジトリを呼び出す | `q=" Suzuki "`            | `q="Suzuki"` でリポジトリ呼び出し・結果返却 |
| 13  | 異常系 | limit = 0（1 未満）                                      | `limit=0`                 | ErrBadParamInput                            |
| 14  | 異常系 | limit = 501（500 超）                                    | `limit=501`               | ErrBadParamInput                            |
| 15  | 異常系 | offset < 0                                               | `offset=-1`               | ErrBadParamInput                            |
| 16  | 異常系 | リポジトリがエラーを返す                                 | repo モックがエラーを返す | ErrInternalServerError を伝搬               |
| 17  | 正常系 | リポジトリが nil を返す場合は空スライスに変換する        | repo が nil 返却          | users=[]（非 nil）・total=0                 |

**フロントエンドテスト**:

`fetch-users.test.ts`:

| #   | 観点     | テスト内容                                      | 入力例                                   | 期待結果                                    |
| --- | -------- | ----------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| 18  | 引数確認 | q・limit・offset がクエリパラメータに展開される | `{ q: "Suzuki", limit: 20, offset: 40 }` | URL に `q=Suzuki&limit=20&offset=40` が付く |
| 19  | 正常系   | パラメータなしではベース URL を呼び出す         | `{}`                                     | `/api/v1/users` のみで apiFetch が呼ばれる  |

`useUserList.test.ts`:

| #   | 観点           | テスト内容                                                            | 入力例                     | 期待結果                                                           |
| --- | -------------- | --------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------ |
| 20  | 正常系         | 初回表示で users と total をセットする                                | マウント時                 | users 配列（uuid 含む）と total が state に入る                    |
| 21  | 検索           | 検索入力で q をフェッチに渡す                                         | `query = "Suz"`            | fetchUsers が `{ q: "Suz" }` を含む引数で呼ばれる                  |
| 22  | 検索           | 検索クエリは 300ms デバウンスされる                                   | 299ms 経過では未フェッチ   | 300ms 後に fetchUsers が呼ばれる                                   |
| 23  | 0 件時         | 0 件時は isEmptyResult が true になる                                 | users=[]・total=0          | `isEmptyResult === true`                                           |
| 24  | 0 件時         | 0 件かつローディング完了時は userCountLabel が "No users found"       | users=[]・ローディング完了 | `userCountLabel === "No users found"`                              |
| 25  | 初回フェッチ   | 初期マウント時に limit=100&offset=0 で呼び出す                        | マウント時                 | fetchUsers が `{ limit: 100, offset: 0, q: undefined }` で呼ばれる |
| 26  | 無限スクロール | users は cachedUsers の全件を返す                                     | 55 件取得                  | users.length === 55                                                |
| 27  | 無限スクロール | sentinel が visible かつ lastBatchSize === FETCH_LIMIT で追加フェッチ | lastBatchSize === 100      | offset=FETCH_LIMIT で fetchUsers が呼ばれる                        |
| 28  | 無限スクロール | sentinel 表示後に追加データが表示される                               | 初回 100 件 + 追加 1 件    | users.length === FETCH_LIMIT + 1                                   |
| 29  | 無限スクロール | isFetchingMore が true → false と推移する                             | sentinel トリガー後        | フェッチ完了後 isFetchingMore === false                            |
| 30  | 無限スクロール | 追加フェッチ失敗時は fetchMoreError が表示される（既存 users 維持）   | 追加フェッチがエラー       | fetchMoreError に "Network error" が含まれ、users 維持             |

`UserList.test.tsx`:

| #   | 観点                 | テスト内容                                              | 期待結果                                                    |
| --- | -------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| 31  | タイトル表示         | "Users" 見出しが表示される                              | heading ロールで "Users" が見つかる                         |
| 32  | スケルトン           | ローディング中にスケルトン行が表示される                | tbody tr が DOM に存在し、各行に td が 3 つある             |
| 33  | 一覧表示             | ユーザーの id・uuid・last_name・first_name が表示される | 各値がテーブルセルに表示される（姓名は "Yamada Taro" 形式） |
| 34  | 列ヘッダー           | id / uuid / 姓名 の列ヘッダーが存在する                 | `columnheader` ロールで id / uuid / 姓名 が見つかる         |
| 35  | アバターなし         | アバターアイコン（頭文字円形）が存在しない              | `data-testid="user-avatar"` 要素が DOM に存在しない         |
| 36  | 0 件時               | "No users found" メッセージが表示される                 | heading "Users" の直後の `<p>` に "No users found" が表示   |
| 37  | エラー時             | エラーメッセージが表示される                            | "Couldn't load users" テキストが表示される                  |
| 38  | ページネーションなし | Previous/Next ボタン・件数セレクタが存在しない          | 該当ボタンが DOM に存在しない                               |
| 39  | sentinel             | sentinel 要素が DOM に存在する                          | `data-testid="sentinel"` 要素が存在する                     |

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
8. handler・service のユニットテストが全て通過する

### フロントエンド

9. `/users` でユーザー一覧画面（UserList コンポーネント）が表示される
10. マウント時に `GET /api/v1/users?limit=100&offset=0` を呼び出し、最大 100 件を取得してクライアントキャッシュする
11. 取得した全件をテーブル形式（`<table>` ベース）で即時表示する。テーブルヘッダー行に id・uuid・姓名 を表示する
12. 各ユーザー行（`<tr>`）に id・uuid・姓名（last_name + first_name 順）を表示する
13. アバターアイコン（姓名の頭文字円形アイコン）を表示しない
14. センチネル要素（IntersectionObserver 監視）が viewport に入り、かつ直前バッチサイズが `FETCH_LIMIT`（100）と等しい場合に追加フェッチする
15. 追加フェッチ中はテーブル末尾にスピナーを表示する
16. 追加フェッチ失敗時はテーブル末尾にエラーメッセージを表示する（既存表示アイテムは維持）
17. キーワード入力後 300ms デバウンスで `q={keyword}` を付けて再取得する（ユーザー一覧リセット・`offset=0` リセットあり）
18. データ取得中はスケルトンローディングをテーブル行形式（3 列）で表示する
19. 検索 0 件時は "No users found" を userCountLabel（ページサブタイトル）に表示する
20. エラー時は "Couldn't load users" エラーカードを表示する
21. `User` 型に `id`・`uuid`・`first_name`・`last_name` フィールドが含まれ、全フロントエンドテストが通過する

---

## 対象外

- ユーザーの作成・更新・削除
- ソート順の変更（固定: users.id ASC）
