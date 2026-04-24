# PRD: get-group

## 概要

| 項目         | 内容                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| 機能名       | `get-group`                                                                                             |
| 目的         | グループ ID を指定してグループの基本情報を取得する。グループ詳細画面（`/groups/:id`）の主要データソース |
| API          | `GET /api/v1/groups/:id`                                                                                |
| 認証         | 必要（AuthMiddleware）                                                                                  |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                          |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups/:id`

#### リクエスト仕様

| フィールド | 型             | 必須 | 説明                    |
| ---------- | -------------- | ---- | ----------------------- |
| `id`       | integer (path) | ✓    | グループの ID。正の整数 |

#### バリデーション一覧

| #   | 対象フィールド | ルール                            | エラー時の挙動  |
| --- | -------------- | --------------------------------- | --------------- |
| 1   | `id`           | 整数に変換できること              | 400 Bad Request |
| 2   | `id`           | 1 以上（正の整数）であること      | 400 Bad Request |
| 3   | `id`           | DB 上に該当グループが存在すること | 404 Not Found   |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `GET /api/v1/groups/:id`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

#### バックエンド処理フロー

```
1. 開始
2. パスパラメータ id を取得してパースする
   - パース失敗または 0 以下の場合 → 400 Bad Request { "message": "given param is not valid" } → 終了
3. サービス層に取得を委譲する
4. サービス層で id が 1 未満かどうかを確認する
   - 1 未満の場合 → 400 Bad Request → 終了
5. 削除済みでないグループを id で検索する
   - 存在しない場合 → 404 Not Found { "message": "your requested item is not found" } → 終了
   - DB エラーの場合 → 500 Internal Server Error { "message": "internal server error" } → 終了
6. グループ基本情報（id, name, description, member_count）を取得する
7. 200 OK + JSON を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### エンドポイント: `GET /api/v1/groups/:id`

凡例: `→` = 次の処理へ進む / 終了 = 処理終了

```
1. 開始
2. グループ一覧テーブルの行をクリックする
3. ルーターが /groups/:id へ遷移する
4. GroupDetailPage コンポーネントがマウントされる
5. GET /api/v1/groups/:id を送信する
6. レスポンス受信
   - 成功（200）→ グループ基本情報（id, name, description, member_count）をキャッシュに格納する → 画面にグループ情報を表示する → 終了
   - 失敗（4xx・5xx）→ エラーメッセージを画面に表示する → 終了
```

> メンバー一覧は GET /api/v1/groups/:id/members で別途取得する。

---

## 確認ステップ 5-3: ファイル配置

→ [plans/schema.md](../../schema.md) を参照。

**原則: 関与した全ファイルを列挙し、役割は具体的に書く。**

### sample-api

| 対応ステップ  | パス                                                        | 役割                                                                                                  |
| ------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 5-2           | `sample-api/domain/group.go`                                | Group Entity（id, name, description, member_count）・GroupMember Entity                               |
| 5-2           | `sample-api/group/service.go`                               | GroupRepository interface に GetByID 追加・GetByID ビジネスロジック                                   |
| 5-5           | `sample-api/group/service_test.go`                          | Service ユニットテスト（GetByID）                                                                     |
| 5-5           | `sample-api/group/mocks/group_repository_mock.go`           | GroupRepository の手動 mock（GetByID 追加）                                                           |
| 5-1, 5-2, 5-4 | `sample-api/internal/rest/group.go`                         | HTTP Handler（GetByID）・GroupService interface に GetByID 追加・ルート登録（GET /api/v1/groups/:id） |
| 5-5           | `sample-api/internal/rest/group_test.go`                    | Handler ユニットテスト（GetByID）                                                                     |
| 5-5           | `sample-api/internal/rest/mocks/group_service_mock.go`      | GroupService の手動 mock（GetByID 追加）                                                              |
| 5-3           | `sample-api/internal/repository/mysql/group.go`             | MySQL 実装（GetByID）                                                                                 |
| 5-3           | `sample-api/db/migrate/20260403120000_create_tables.up.sql` | テーブル定義・マイグレーション（golang-migrate）                                                      |

### sample-front

| 対応ステップ | パス                                                              | 役割                                                           |
| ------------ | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| 5-2-FE       | `sample-front/package.json`                                       | react-router v7 依存追加                                       |
| 5-2-FE       | `sample-front/src/app/router.tsx`                                 | ルーター設定（/ → HomePage, /groups/:id → GroupDetailPage）    |
| 5-2-FE       | `sample-front/src/app/App.tsx`                                    | RouterProvider への切り替え                                    |
| 5-2-FE       | `sample-front/src/pages/group-detail/index.ts`                    | Public API（barrel export）                                    |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/GroupDetailPage.tsx`      | ルーターエントリポイント（GroupDetailView にレンダリング委譲） |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/GroupDetailView.tsx`      | グループ詳細表示コンポーネント（useGroupDetail フック使用）    |
| 5-2-FE       | `sample-front/src/pages/group-detail/api/fetch-group.ts`          | GET /api/v1/groups/:id 呼び出し                                |
| 5-2-FE       | `sample-front/src/pages/group-detail/model/group-detail.ts`       | GroupDetail 型定義                                             |
| 5-2-FE       | `sample-front/src/pages/group-detail/model/group-detail-state.ts` | グループ詳細取得カスタムフック（`useGroupDetail` を export）   |
| 5-2-FE       | `sample-front/src/pages/home/ui/GroupList.tsx`                    | 行クリックで /groups/:id へ遷移する onClick 追加               |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/groups/:id`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "id": 1,
  "name": "dev-team",
  "description": "開発チーム",
  "member_count": 5
}
```

### エラーケース一覧

| 条件                     | 発生レイヤー                       | ステータス                | レスポンス                                          |
| ------------------------ | ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可    | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満           | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| 該当グループが存在しない | Service / Repository               | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー                | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| ネットワークエラー       | フロントエンド: API クライアント層 | —                         | エラーメッセージ表示                                |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/groups/:id`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                     | 入力例                 | 期待結果                   |
| --- | -------- | ------------------------------ | ---------------------- | -------------------------- |
| 1   | 正常系   | 存在するグループ ID で詳細取得 | `id=1`                 | 200 OK + グループ情報 JSON |
| 2   | 異常系   | 文字列を id に指定             | `id=abc`               | 400 Bad Request            |
| 3   | 境界値   | id=0（最小境界外）             | `id=0`                 | 400 Bad Request            |
| 4   | 異常系   | 負の id                        | `id=-1`                | 400 Bad Request            |
| 5   | 異常系   | 存在しないグループ ID          | `id=9999`              | 404 Not Found              |
| 6   | 例外処理 | DB 接続エラー発生時            | DB mock がエラーを返す | 500 Internal Server Error  |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                 | 入力例                   | 期待結果               |
| --- | -------- | -------------------------- | ------------------------ | ---------------------- |
| 7   | 正常系   | 存在するグループ ID で取得 | `id=1`                   | Group を返す           |
| 8   | 異常系   | 存在しないグループ ID      | `id=9999`                | ErrNotFound            |
| 9   | 境界値   | id=0（最小境界外）         | `id=0`                   | ErrBadParamInput       |
| 10  | 例外処理 | Repository がエラーを返す  | repo mock がエラーを返す | ErrInternalServerError |

---

## 最低要件

1. `GET /api/v1/groups/:id` が実装されており、グループ基本情報（id, name, description, member_count）を返す
2. `id` が整数でない / 0 以下の場合に 400 を返す
3. 対象グループが存在しない場合に 404 を返す
4. フロントエンドにルーターライブラリ（react-router v7）が導入されており、`/groups/:id` にアクセスすると GroupDetailPage が表示される
5. グループ一覧テーブルの各行クリックで `/groups/:id` に遷移できる
6. 詳細ページにグループ基本情報（id, name, description, member_count）が表示される

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- グループの更新・削除
- メンバー一覧取得（`list-group-members` で別途管理）
