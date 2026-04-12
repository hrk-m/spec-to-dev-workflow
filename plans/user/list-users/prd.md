# PRD: list-users

## 概要

| 項目         | 内容                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 機能名       | `list-users`                                                                                                                     |
| 目的         | アクティブなユーザー一覧をページネーション・キーワード検索付きで取得・表示する                                                   |
| API          | `GET /api/v1/users`                                                                                                              |
| 認証         | 不要                                                                                                                             |
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
3. UsersPage → API クライアント: GET /api/v1/users?limit=500&offset=0 を送信
4. レスポンスは成功？
   - Yes（200）→
      5. 取得したユーザー一覧（最大 500 件）と total を state にキャッシュ
      6. 画面にデフォルト 20 件/ページで表示
      7. ページネーション（20 / 50 / 100 件/ページ切り替え）を UI に表示
         - ページネーション制御は effectiveTotal = cachedUsers.length（実際の取得件数）を使用
      8. 終了
   - No（4xx・5xx）→
      5. エラーメッセージを画面に表示
      6. 終了
9. ユーザーが表示ページを進め、キャッシュ済みの 500 件を超えるページに到達
10. UsersPage → API クライアント: GET /api/v1/users?limit=500&offset=500 を送信
11. 手順 4 と同様（取得データを既存 state に追加キャッシュ）
12. ユーザーが検索キーワードを入力
13. 300ms デバウンス後にキャッシュをクリアして
    GET /api/v1/users?limit=500&offset=0&q={keyword} を送信
14. 手順 4 と同様（キャッシュをクリアして再キャッシュ）
15. 検索結果が 0 件の場合
    - ヘッダーサブタイトルに "No users found" を表示
    - ページネーションを非表示にする
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
    - total は q フィルターなしの全ユーザー件数（検索ヒット件数ではない）
    - total = 0 の場合 → 空配列と 0 を返す
11. DB: SELECT id, first_name, last_name FROM users WHERE deleted_at IS NULL
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
      "first_name": "太郎",
      "last_name": "山田"
    }
  ],
  "total": 42
}
```

※ `total`: `q` フィルターなし（`deleted_at IS NULL`）の全ユーザー件数
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
| 検索結果 0 件             | フロントエンド表示制御  | —          | "No users found" 表示・ページネーション非表示 |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/users`

**Handler テスト** (`internal/rest/user_test.go`):

| #   | 観点     | テスト内容                                 | 入力例                       | 期待結果                       |
| --- | -------- | ------------------------------------------ | ---------------------------- | ------------------------------ |
| 1   | 正常系   | パラメータなしでユーザー一覧を取得         | クエリなし                   | 200 OK + users 配列 + total    |
| 2   | 正常系   | q ありで検索キーワードをサービスに渡す     | `q=山田`                     | 200 OK + 絞り込み結果          |
| 3   | 正常系   | limit / offset 指定でページネーション      | `limit=10&offset=20`         | 200 OK + 対象範囲の結果        |
| 4   | 正常系   | ユーザーが 0 件の場合                      | (空 DB)                      | 200 OK + users=[] + total=0    |
| 5   | 異常系   | limit が整数でない                         | `limit=abc`                  | 400 Bad Request                |
| 6   | 異常系   | limit = 0（1 未満）                        | `limit=0`                    | 400 Bad Request                |
| 7   | 異常系   | limit = 501（500 超）                      | `limit=501`                  | 400 Bad Request                |
| 8   | 異常系   | offset が整数でない                        | `offset=abc`                 | 400 Bad Request                |
| 9   | 異常系   | offset < 0                                 | `offset=-1`                  | 400 Bad Request                |
| 10  | 異常系   | service が DB エラーを返す                 | service モックがエラーを返す | 500 Internal Server Error      |
| 11  | 外部依存 | Service をモックで切り分け                 | mockUserService              | Handler 単体でテスト可能       |

**Service テスト** (`user/service_test.go`):

| #   | 観点     | テスト内容                               | 入力例                         | 期待結果                       |
| --- | -------- | ---------------------------------------- | ------------------------------ | ------------------------------ |
| 12  | 正常系   | repository.ListUsers 成功               | `limit=10, offset=0`           | users 配列 + total             |
| 13  | 異常系   | limit = 0（1 未満）                      | `limit=0`                      | ErrBadParamInput               |
| 14  | 異常系   | limit = 501（500 超）                    | `limit=501`                    | ErrBadParamInput               |
| 15  | 異常系   | offset < 0                               | `offset=-1`                    | ErrBadParamInput               |
| 16  | 正常系   | q を TrimSpace で正規化                  | `q="  山田  "`                 | `q="山田"` でリポジトリ呼び出し |
| 17  | 外部依存 | Repository をモックで切り分け            | mockUserRepository             | Service 単体でテスト可能       |

**フロントエンドテスト**:

`fetch-users.test.ts`:

| #   | 観点     | テスト内容                               | 入力例                  | 期待結果                             |
| --- | -------- | ---------------------------------------- | ----------------------- | ------------------------------------ |
| 18  | 正常系   | GET /api/v1/users を正しく呼び出す       | クエリなし              | apiFetch が正しい URL で呼ばれる     |
| 19  | 引数確認 | q・limit・offset がクエリパラメータに展開される | `{ q: "山田", limit: 10, offset: 0 }` | URL に `q=山田&limit=10&offset=0` が付く |

`useUserList.test.ts`:

| #   | 観点         | テスト内容                               | 入力例              | 期待結果                             |
| --- | ------------ | ---------------------------------------- | ------------------- | ------------------------------------ |
| 20  | 正常系       | 初回ロードでユーザー一覧を取得・キャッシュ | マウント時          | users 配列と total が state に入る   |
| 21  | 検索         | 300ms デバウンスで再取得する              | `query = "山田"`    | 300ms 後に fetchUsers が呼ばれる     |
| 22  | ページネーション | ページ切り替えで visibleUserCountLabel が更新される | `page = 2` | 表示範囲ラベルが変わる               |
| 23  | 0 件時       | isEmptyResult が true になる             | users=[]            | `isEmptyResult === true`             |

`UserList.test.tsx`:

| #   | 観点       | テスト内容                               | 期待結果                          |
| --- | ---------- | ---------------------------------------- | --------------------------------- |
| 24  | スケルトン | ローディング中にスケルトンが表示される   | スケルトン行が DOM に存在する     |
| 25  | 一覧表示   | ユーザーの first_name / last_name が表示される | 各ユーザー名が画面に表示される |
| 26  | 0 件時     | "No users found" メッセージが表示される  | 空状態メッセージが DOM に存在する |
| 27  | エラー時   | エラーメッセージが表示される             | エラーカードが DOM に存在する     |

---

## ファイル配置

### sample-api

| ファイル                                             | 役割                                    |
| ---------------------------------------------------- | --------------------------------------- |
| `sample-api/domain/user.go`                          | User Entity（id, first_name, last_name）|
| `sample-api/user/service.go`                         | UserRepository interface・ListUsers 実装 |
| `sample-api/user/service_test.go`                    | Service ユニットテスト                  |
| `sample-api/user/mocks/user_repository_mock.go`      | UserRepository の手動 mock              |
| `sample-api/internal/rest/user.go`                   | HTTP Handler（ListUsers）               |
| `sample-api/internal/rest/user_test.go`              | Handler ユニットテスト                  |
| `sample-api/internal/rest/mocks/user_service_mock.go`| UserService の手動 mock                 |
| `sample-api/internal/repository/mysql/user.go`       | MySQL 実装（ListUsers・GetByID）        |

### sample-front

| ファイル                                                    | 役割                                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `sample-front/src/app/App.tsx`                              | Sidebar に `onNavigate` を渡す配線                                                        |
| `sample-front/src/app/router.tsx`                           | `/users` ルート登録                                                                       |
| `sample-front/src/app/routes/GroupNavigationLayout.tsx`     | `/users` マッチ時に `<UsersPage />` を描画                                                |
| `sample-front/src/widgets/sidebar/ui/Sidebar.tsx`           | Groups / Users ナビゲーションボタン                                                       |
| `sample-front/src/pages/users/index.ts`                     | `UsersPage`・型定義の barrel export                                                       |
| `sample-front/src/pages/users/ui/UsersPage.tsx`             | ユーザー一覧ページコンポーネント                                                          |
| `sample-front/src/pages/users/ui/UserList.tsx`              | 検索・ページネーション・スケルトンローディング・空状態表示付きユーザー一覧コンポーネント  |
| `sample-front/src/pages/users/api/fetch-users.ts`           | GET /api/v1/users 呼び出し（q, limit, offset 対応）                                      |
| `sample-front/src/pages/users/model/user.ts`                | User・UsersResponse・FetchUsersParams 型定義                                              |
| `sample-front/src/pages/users/model/user-list.ts`           | `useUserList` フック（クライアントキャッシュ・ページネーション・300ms デバウンス）        |

---

## 最低要件

### バックエンド

1. `GET /api/v1/users` が実装されており、アクティブユーザー一覧（id, first_name, last_name）と total を返す
2. `deleted_at IS NULL` のユーザーのみを対象とする
3. `q` パラメータで `search_key LIKE '%q%'` の検索が動作する（前後スペースはトリム）
4. `limit`（1〜500、デフォルト: 500）・`offset`（0 以上、デフォルト: 0）によるページネーションが動作する
5. 範囲外の limit / offset は 400 を返す
6. DB エラー時は 500 を返す
7. `total` は `q` フィルターなしの全ユーザー件数を返す（検索ヒット件数ではない）

### フロントエンド

8. サイドバーに Groups / Users の 2 項目が表示され、Users クリックで `/users` へ遷移できる
9. `/users` でユーザー一覧画面（UserList コンポーネント）が表示される
10. マウント時に `GET /api/v1/users?limit=500&offset=0` を呼び出し、最大 500 件を一括取得してクライアントキャッシュする
11. デフォルト 20 件/ページ表示、Previous/Next + 20/50/100 件/ページ切り替えを提供する
12. ページネーション制御は `effectiveTotal`（実際の取得件数）を使用する。検索クエリがある場合は `cachedUsers.length`、ない場合は API の `total`（全件数）を使用し、Req 14 の追加フェッチを可能にする
13. キーワード入力後 300ms デバウンスで `q={keyword}` を付けて再取得する（キャッシュクリアあり）
14. 500 件超過時は offset を進めて追加取得し、既存キャッシュに追加する
15. データ取得中はスケルトンローディングを表示する
16. 検索 0 件時は "No users found" をヘッダーサブタイトルに表示し、ページネーションを非表示にする
17. エラー時はエラーメッセージを表示する

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- ユーザーの作成・更新・削除
- ソート順の変更（固定: users.id ASC）
