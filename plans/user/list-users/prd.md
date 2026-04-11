# PRD: list-users

## 概要

| 項目         | 内容                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| 機能名       | `list-users`                                                           |
| 目的         | アクティブなユーザー一覧をページネーション・キーワード検索付きで取得する |
| API          | `GET /api/v1/users`                                                    |
| 認証         | 不要                                                                   |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                         |

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

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `GET /api/v1/users`

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

※ `total`: フィルターなし（`deleted_at IS NULL`）の全ユーザー件数
※ `users`: 今回のフェッチで返ったユーザー一覧（最大 `limit` 件）

### エラーケース一覧

| 条件                                   | 発生レイヤー      | ステータス                | レスポンス                                  |
| -------------------------------------- | ----------------- | ------------------------- | ------------------------------------------- |
| `limit` が整数でない / 1〜500 の範囲外 | Handler           | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| `offset` が整数でない / 0 未満         | Handler           | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| DB エラー                              | Repository        | 500 Internal Server Error | `{ "message": "internal server error" }`   |

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

---

## 最低要件

1. `GET /api/v1/users` が実装されており、アクティブユーザー一覧（id, first_name, last_name）と total を返す
2. `deleted_at IS NULL` のユーザーのみを対象とする
3. `q` パラメータで `search_key LIKE '%q%'` の検索が動作する（前後スペースはトリム）
4. `limit`（1〜500、デフォルト: 500）・`offset`（0 以上、デフォルト: 0）によるページネーションが動作する
5. 範囲外の limit / offset は 400 を返す
6. DB エラー時は 500 を返す

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- ユーザーの作成・更新・削除
- ソート順の変更（固定: users.id ASC）
