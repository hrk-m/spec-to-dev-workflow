# PRD: get-user

## 概要

| 項目         | 内容                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------- |
| 機能名       | `get-user`                                                                                   |
| 目的         | ユーザー一覧テーブルの行クリックで /users/:id へ遷移し、選択したユーザーの詳細情報を表示する |
| API          | `GET /api/v1/users/:id`                                                                      |
| 認証         | 必要（AuthMiddleware）                                                                       |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                               |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/users/:id`

#### リクエスト仕様

| フィールド | 型            | 必須 | 説明                        |
| ---------- | ------------- | ---- | --------------------------- |
| `id`       | uint64 (path) | ✅   | ユーザー ID（1 以上の整数） |

#### バリデーション一覧

| #   | 対象フィールド | ルール                           | エラー時の挙動  |
| --- | -------------- | -------------------------------- | --------------- |
| 1   | `id`           | 整数に変換できること             | 400 Bad Request |
| 2   | `id`           | 1 以上であること（0 以下は不正） | 400 Bad Request |

#### フロントエンド側バリデーション

なし（URL パラメータは router から取得し、バックエンドに委譲する）

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `GET /api/v1/users/:id`

凡例: → は条件分岐・次ステップ、終了 はフロー終端を示す

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/users/:id）を受信
3. パスパラメータ id を parsePathID で uint64 に変換
   - 整数変換不可または id < 1 の場合 → 400 Bad Request を返す → 終了
4. ユーザー詳細取得サービスを呼び出す
5. リポジトリ経由で id に一致するユーザーを取得
   - 該当レコードなし → 404 Not Found を返す → 終了
   - DB エラー → 500 Internal Server Error を返す → 終了
6. 成功 → 200 OK + ユーザー情報を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

凡例: → は条件分岐・次ステップ、終了 はフロー終端を示す

```
1. 開始
2. ユーザー一覧（/users）でテーブル行をクリックする
3. useNavigate で /users/:id へ遷移する
4. UserDetailPage コンポーネントがマウントされる
5. useParams で id を取得する
6. useUserDetail(id) フックが初期化される
   - ローディング中 → スケルトンを表示する
7. GET /api/v1/users/:id を送信する
   - 成功（200）→
      8. id / uuid / 姓名（last_name + first_name）を表示する → 終了
   - 失敗（404）→
      8. 「ユーザーが見つかりません」を表示する → 終了
   - 失敗（4xx・5xx・ネットワークエラー）→
      8. エラーカードを表示する → 終了
9. 「戻る」ボタンをクリックすると /users へ遷移する → 終了
```

---

## 確認ステップ 5-3: ファイル配置

### sample-api

| 対応ステップ  | パス                                                  | 役割                                                               |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| 5-1, 5-2, 5-4 | `sample-api/internal/rest/user.go`                    | GetUser ハンドラ追加・UserService interface に GetUser 追加        |
| 5-2           | `sample-api/user/service.go`                          | GetUser ビジネスロジック・UserRepository interface に GetByID 追加 |
| 5-2           | `sample-api/internal/repository/mysql/user.go`        | GetByID MySQL 実装追加                                             |
| 5-5           | `sample-api/internal/rest/user_test.go`               | GetUser Handler ユニットテスト追加                                 |
| 5-5           | `sample-api/internal/rest/mocks/user_service_mock.go` | GetUser モックメソッド追加                                         |
| 5-5           | `sample-api/user/service_test.go`                     | GetUser Service ユニットテスト追加                                 |
| 5-5           | `sample-api/user/mocks/user_repository_mock.go`       | GetByID モックメソッド追加                                         |

### sample-front

| 対応ステップ | パス                                                                      | 役割                                                          |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 5-2-FE       | `sample-front/src/app/router.tsx`                                         | ProtectedRoute 直下に /users/:id ルート追加                   |
| 5-2-FE       | `sample-front/src/pages/users/ui/UserList.tsx`                            | テーブル行に onClick（/users/:id 遷移）を追加                 |
| 5-2-FE       | `sample-front/src/pages/user-detail/index.ts`                             | UserDetailPage の barrel export                               |
| 5-2-FE       | `sample-front/src/pages/user-detail/ui/UserDetailPage.tsx`                | ユーザー詳細ページコンポーネント（useParams + useUserDetail） |
| 5-2-FE       | `sample-front/src/pages/user-detail/ui/UserDetailPage.styles.ts`          | ユーザー詳細ページのスタイル定義                              |
| 5-2-FE       | `sample-front/src/pages/user-detail/api/fetch-user.ts`                    | GET /api/v1/users/:id 呼び出し                                |
| 5-2-FE       | `sample-front/src/pages/user-detail/model/user-detail.ts`                 | UserDetail 型定義                                             |
| 5-2-FE       | `sample-front/src/pages/user-detail/model/user-detail-state.ts`           | useUserDetail フック                                          |
| 5-5          | `sample-front/src/pages/user-detail/api/__tests__/fetch-user.test.ts`     | fetchUser 関数のテスト                                        |
| 5-5          | `sample-front/src/pages/user-detail/ui/__tests__/UserDetailPage.test.tsx` | UserDetailPage コンポーネントのテスト                         |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/users/:id`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "id": 1,
  "uuid": "550e8400-e29b-41d4-a716-446655440001",
  "first_name": "太郎",
  "last_name": "山田"
}
```

### エラーケース一覧（バックエンド）

| 条件                                | 発生レイヤー | ステータス                | レスポンス                                          |
| ----------------------------------- | ------------ | ------------------------- | --------------------------------------------------- |
| `id` が整数でない / 1 未満          | Handler      | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` に該当するユーザーが存在しない | Repository   | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー                           | Repository   | 500 Internal Server Error | `{ "message": "internal server error" }`            |

### エラーケース一覧（フロントエンド）

| 条件                 | 発生レイヤー       | UI 挙動                            |
| -------------------- | ------------------ | ---------------------------------- |
| 404 Not Found        | API クライアント層 | 「ユーザーが見つかりません」を表示 |
| 4xx / 5xx レスポンス | API クライアント層 | エラーカードを表示                 |
| ネットワークエラー   | API クライアント層 | エラーカードを表示                 |
| ローディング中       | フロントエンド表示 | スケルトンを表示                   |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/users/:id`

**Handler テスト** (`internal/rest/user_test.go`):

| #   | 観点   | テスト内容                                            | 入力例                       | 期待結果                  |
| --- | ------ | ----------------------------------------------------- | ---------------------------- | ------------------------- |
| 1   | 正常系 | 存在する ID でユーザーを取得できる                    | `id=1`                       | 200 OK + ユーザー情報     |
| 2   | 異常系 | id が整数変換不可の場合                               | `id=abc`                     | 400 Bad Request           |
| 3   | 異常系 | id = 0 の場合                                         | `id=0`                       | 400 Bad Request           |
| 4   | 異常系 | 存在しない ID の場合（service が ErrNotFound を返す） | `id=9999`                    | 404 Not Found             |
| 5   | 異常系 | service が DB エラーを返す場合                        | service モックがエラーを返す | 500 Internal Server Error |

**Service テスト** (`user/service_test.go`):

| #   | 観点   | テスト内容                                                   | 入力例                           | 期待結果                      |
| --- | ------ | ------------------------------------------------------------ | -------------------------------- | ----------------------------- |
| 6   | 正常系 | 存在する ID でユーザーを返せる                               | `id=1`                           | domain.User が返る            |
| 7   | 異常系 | リポジトリが ErrNotFound を返した場合は ErrNotFound を返す   | repo モックが ErrNotFound を返す | ErrNotFound                   |
| 8   | 異常系 | リポジトリが DB エラーの場合は ErrInternalServerError を伝搬 | repo モックがエラーを返す        | ErrInternalServerError を伝搬 |

**フロントエンドテスト**:

`fetch-user.test.ts`:

| #   | 観点     | テスト内容                          | 期待結果                                 |
| --- | -------- | ----------------------------------- | ---------------------------------------- |
| 9   | 引数確認 | fetchUser が ID 付き URL を呼び出す | `/api/v1/users/1` で apiFetch が呼ばれる |

`UserDetailPage.test.tsx`:

| #   | 観点   | テスト内容                                     | 期待結果                            |
| --- | ------ | ---------------------------------------------- | ----------------------------------- |
| 10  | 正常系 | ローディング中にスケルトンを表示する           | スケルトン要素が DOM に存在する     |
| 11  | 正常系 | 成功時に id / uuid / 姓名を表示する            | 各値が DOM に表示される             |
| 12  | 異常系 | 404 時に「ユーザーが見つかりません」を表示する | 該当メッセージが DOM に表示される   |
| 13  | 異常系 | エラー時にエラーカードを表示する               | エラーカード要素が DOM に表示される |
| 14  | 正常系 | 戻るボタンクリックで /users へ遷移する         | `/users` 画面に遷移する             |

---

## 最低要件

### バックエンド

1. `GET /api/v1/users/:id` が実装されており、ユーザー情報（id, uuid, first_name, last_name）を返す
2. id が整数変換不可または 1 未満の場合は 400 を返す
3. id に該当するユーザーが存在しない場合は 404 を返す
4. DB エラー時は 500 を返す
5. handler・service のユニットテストが全て通過する

### フロントエンド

1. `/users` のテーブル行クリックで `/users/:id` へ遷移する
2. `/users/:id` でユーザー詳細画面（UserDetailPage）が表示される（ProtectedRoute 直下に配置）
3. マウント時に `GET /api/v1/users/:id` を呼び出し、id / uuid / 姓名（last_name + first_name）を表示する
4. ローディング中はスケルトンを表示する
5. 404 時は「ユーザーが見つかりません」を表示する
6. 4xx / 5xx・ネットワークエラー時はエラーカードを表示する
7. 「戻る」ボタンで `/users` へ遷移する
8. 全フロントエンドテストが通過する

---

## 対象外

- ユーザーの作成・更新・削除
- ユーザーのグループ一覧表示
