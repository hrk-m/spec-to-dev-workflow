# PRD: get-group

## 概要

| 項目 | 内容 |
|---|---|
| 機能名 | `get-group` |
| 目的 | グループ ID を指定してグループの基本情報を取得する。グループ詳細画面（`/groups/:id`）の主要データソース |
| API | `GET /api/v1/groups/:id` |
| 認証 | 不要 |
| データソース | MySQL (`sample-api/internal/repository/mysql`) |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups/:id`

#### リクエスト仕様

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | integer (path) | ✓ | グループの ID。正の整数 |

#### バリデーション一覧

| # | 対象フィールド | ルール | エラー時の挙動 |
|---|---|---|---|
| 1 | `id` | 整数に変換できること | 400 Bad Request |
| 2 | `id` | 1 以上（正の整数）であること | 400 Bad Request |
| 3 | `id` | DB 上に該当グループが存在すること | 404 Not Found |

---

## 確認ステップ 5-2: 処理フロー

### エンドポイント: `GET /api/v1/groups/:id`

#### フロントエンド 処理フロー

```
1. 開始
2. グループ一覧テーブルの行をクリック
3. ルーターが /groups/:id へ遷移
4. GroupDetailPage コンポーネントがマウントされる
5. GroupDetailPage → API クライアント: GET /api/v1/groups/:id を送信
6. レスポンスは成功？
   - Yes（200）→
      7. グループ基本情報（id, name, description, member_count）を state に格納
      8. 画面にグループ情報を表示
      9. 終了（メンバー一覧は GET /api/v1/groups/:id/members で別途取得）
   - No（4xx・5xx）→
      7. エラーメッセージを画面に表示
      8. 終了
```

#### バックエンド 処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/groups/:id）を受信
3. パスパラメータ id を c.Param("id") で取得
4. id を整数にパース
   - パース失敗の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
5. id < 1 の場合
   - 400 Bad Request { "message": "given param is not valid" } を返す
   - 終了
6. Service.GetByID(ctx, id) を呼び出す
7. Repository.GetByID(ctx, id) を呼び出す
8. DB: groups テーブルから id に一致するレコードを SELECT（deleted_at IS NULL）
9. グループが存在するか確認
   - No（ErrNotFound）→
      - 404 Not Found { "message": "not found" } を返す
      - 終了
   - Yes →
      10. グループ基本情報を返却
      11. 200 OK + JSON を返す
      12. 終了
```

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md#group--get-group](../../schema.md#group--get-group) を参照。

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

| 条件 | 発生レイヤー | ステータス | レスポンス |
|---|---|---|---|
| `id` が整数に変換不可 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| `id` が 1 未満 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| 該当グループが存在しない | Service / Repository | 404 Not Found | `{ "message": "not found" }` |
| DB エラー | Repository | 500 Internal Server Error | `{ "message": "internal server error" }` |
| ネットワークエラー | フロントエンド: API クライアント層 | — | エラーメッセージ表示 |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/groups/:id`

| # | 観点 | テスト内容 | 入力例 | 期待結果 |
|---|---|---|---|---|
| 1 | 正常系 | 存在するグループ ID で詳細取得 | `id=1` | 200 OK + グループ情報 JSON |
| 2 | 異常系 | 存在しないグループ ID で取得 | `id=9999` | 404 Not Found |
| 3 | 異常系 | 文字列を id に指定 | `id="abc"` | 400 Bad Request |
| 4 | 境界値 | id=0（最小境界外） | `id=0` | 400 Bad Request |
| 5 | 境界値 | id=1（最小境界内） | `id=1` | 200 OK（存在する場合） |
| 6 | 異常系 | 負の id | `id=-1` | 400 Bad Request |
| 7 | 例外処理 | DB 接続エラー発生時 | DB mock がエラーを返す | 500 Internal Server Error |
| 8 | 外部依存 | Service をモックで切り分け | mockGroupService | Handler 単体でテスト可能 |
| 9 | 外部依存 | Repository をモックで切り分け | mockGroupRepository | Service 単体でテスト可能 |

---

## ファイル配置

### sample-api

| ファイル | 役割 |
|---|---|
| `sample-api/domain/group.go` | Group Entity・GroupDetailResponse 追加 |
| `sample-api/group/service.go` | GroupRepository interface に GetByID 追加・GetByID ビジネスロジック |
| `sample-api/group/service_test.go` | Service ユニットテスト（GetByID）|
| `sample-api/group/mocks/group_repository_mock.go` | GroupRepository の手動 mock（GetByID 追加）|
| `sample-api/internal/rest/group.go` | HTTP Handler（GetByID）・GroupService interface に GetByID 追加・ルート登録（GET /api/v1/groups/:id） |
| `sample-api/internal/rest/group_test.go` | Handler ユニットテスト（GetByID）|
| `sample-api/internal/rest/mocks/group_service_mock.go` | GroupService の手動 mock（GetByID 追加）|
| `sample-api/internal/repository/mysql/group.go` | MySQL 実装（GetByID）|

### sample-front

| ファイル | 役割 |
|---|---|
| `sample-front/package.json` | react-router v7 依存追加 |
| `sample-front/src/app/router.tsx` | ルーター設定（/ → HomePage, /groups/:id → GroupDetailPage） |
| `sample-front/src/app/App.tsx` | RouterProvider への切り替え |
| `sample-front/src/pages/group-detail/index.ts` | Public API（barrel export） |
| `sample-front/src/pages/group-detail/ui/GroupDetailPage.tsx` | ページコンポーネント本体 |
| `sample-front/src/pages/group-detail/api/fetch-group.ts` | GET /api/v1/groups/:id 呼び出し |
| `sample-front/src/pages/group-detail/model/group-detail.ts` | GroupDetail 型定義 |
| `sample-front/src/pages/group-detail/model/useGroupDetail.ts` | グループ詳細取得カスタムフック |
| `sample-front/src/pages/home/ui/GroupList.tsx` | 行クリックで /groups/:id へ遷移する onClick 追加 |

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
