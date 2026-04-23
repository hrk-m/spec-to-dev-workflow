# PRD: delete-group-members

## 概要

| 項目         | 内容                                           |
| ------------ | ---------------------------------------------- |
| 機能名       | `delete-group-members`                         |
| 目的         | グループから複数メンバーを一括削除する         |
| API          | `DELETE /api/v1/groups/:id/members`            |
| 認証         | 必要                                           |
| データソース | MySQL (`sample-api/internal/repository/mysql`) |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `DELETE /api/v1/groups/:id/members`

#### リクエスト仕様

| フィールド | 型              | 必須 | 説明                                  |
| ---------- | --------------- | ---- | ------------------------------------- |
| `id`       | uint64 (path)   | ✓    | グループ ID                           |
| `user_ids` | []uint64 (body) | ✓    | 削除するユーザー ID リスト（1件以上） |

#### バリデーション一覧

| #   | 対象フィールド   | ルール                                 | エラー時の挙動  |
| --- | ---------------- | -------------------------------------- | --------------- |
| 0   | リクエストボディ | JSON デコードに成功すること            | 400 Bad Request |
| 1   | `id`             | 正の整数であること                     | 400 Bad Request |
| 2   | `id`             | DB 上にグループが存在すること          | 404 Not Found   |
| 3   | `user_ids`       | 1件以上であること                      | 400 Bad Request |
| 4   | `user_ids`       | 全ユーザーがグループメンバーであること | 404 Not Found   |
| 5   | `user_ids`       | 重複 ID は自動排除（サービス層）       | -               |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `DELETE /api/v1/groups/:id/members`

凡例: `→` = 次の処理へ進む / `終了` = 処理終了 / 400 = 400 Bad Request / 404 = 404 Not Found / 500 = 500 Internal Server Error

```
1. 認証ミドルウェアがリクエストユーザーを取得してコンテキストにセットする
   - ユーザー取得失敗 → 認証エラーに対応するステータスを返す → 終了
2. パスパラメータ id を正の整数として取得する
   - 非数値・0・負数 → 400 { "message": "given param is not valid" } → 終了
3. リクエストボディを JSON としてデコードする
   - デコード失敗 → 400 → 終了
4. user_ids が空である
   - Yes → 400 { "message": "given param is not valid" } → 終了
   - No → 続行
5. user_ids の重複を排除する
6. グループの存在を確認する
   - 存在しない → 404 { "message": "your requested item is not found" } → 終了
7. トランザクションを開始する
   - 開始失敗 → 500 { "message": "internal server error" } → 終了
8. 指定メンバーを group_members テーブルから削除する
   - 削除クエリ実行失敗 → ロールバック → 500 { "message": "internal server error" } → 終了
9. 削除件数を取得する
   - 取得失敗 → ロールバック → 500 { "message": "internal server error" } → 終了
   - 削除件数が指定 ID 数と一致しない（非メンバーが含まれる）→ ロールバック → 404 { "message": "your requested item is not found" } → 終了
10. トランザクションをコミットする
    - コミット失敗 → ロールバック → 500 { "message": "internal server error" } → 終了
11. 204 No Content を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

凡例: `→` = 次の処理へ進む / `終了` = 処理終了

```
1. ユーザーがチェックボックスで削除対象メンバーを選択する
2. 「削除」ボタンをクリックする（未選択時は非活性）
   - 確認ダイアログを開く
3. 確認ダイアログで「削除する」ボタンをクリックする
   - ローディング状態を開始する
4. DELETE /api/v1/groups/:id/members にリクエストを送信する（選択中の user_ids を body に含める）
5. レスポンス受信
   - 成功（204 No Content）→ 選択状態をリセット → ダイアログを閉じる → メンバーリストキャッシュをクリアする → メンバー一覧を再取得する → 終了
   - 失敗 → ダイアログ内にエラーメッセージを表示する → 終了
6. ローディング状態を終了する → 終了
```

---

## 確認ステップ 5-3: ファイル配置

### sample-api

| 対応ステップ  | パス                                                        | 役割                                                                                  |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 5-1, 5-2, 5-4 | `sample-api/internal/rest/group.go`                         | HTTP Handler・GroupService interface・ルート登録（DELETE /api/v1/groups/:id/members） |
| 5-2           | `sample-api/domain/group.go`                                | Group Entity・エラー定義                                                              |
| 5-2           | `sample-api/group/service.go`                               | GroupRepository interface・重複排除・グループ存在確認・削除委譲のビジネスロジック     |
| 5-3           | `sample-api/internal/repository/mysql/group.go`             | MySQL 実装（トランザクション・削除・件数確認）                                        |
| 5-3           | `sample-api/db/migrate/20260403120000_create_tables.up.sql` | `group_members` テーブル定義・マイグレーション（golang-migrate）                      |
| 5-5           | `sample-api/internal/rest/group_test.go`                    | Handler ユニットテスト                                                                |
| 5-5           | `sample-api/internal/rest/mocks/group_service_mock.go`      | GroupService の手動 mock                                                              |
| 5-5           | `sample-api/group/service_test.go`                          | Service ユニットテスト                                                                |
| 5-5           | `sample-api/group/mocks/group_repository_mock.go`           | GroupRepository の手動 mock                                                           |

### sample-front

| 対応ステップ | パス                                                                             | 役割                                                  |
| ------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 5-2-FE       | `sample-front/src/pages/group-detail/api/delete-group-members.ts`                | API クライアント（DELETE /api/v1/groups/:id/members） |
| 5-5          | `sample-front/src/pages/group-detail/api/__tests__/delete-group-members.test.ts` | API クライアントユニットテスト                        |
| 5-2-FE       | `sample-front/src/pages/group-detail/model/member-list.ts`                       | メンバー一覧の状態管理・削除後のキャッシュクリア      |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/MemberList.tsx`                          | メンバー一覧表示・選択・削除確認ダイアログ・削除処理  |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `DELETE /api/v1/groups/:id/members`

### レスポンス（正常系）

- ステータス: `204 No Content`（ボディなし）

### エラーケース一覧

| 条件                         | 発生レイヤー | ステータス                | レスポンス                                          |
| ---------------------------- | ------------ | ------------------------- | --------------------------------------------------- |
| id が不正                    | Handler      | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| user_ids が空                | Handler      | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| グループ未存在               | Service      | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| 指定ユーザーがメンバーでない | Repository   | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| 未認証                       | Middleware   | 401 Unauthorized          | `{ "message": "Unauthorized" }`                     |
| DB エラー                    | Repository   | 500 Internal Server Error | `{ "message": "internal server error" }`            |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `DELETE /api/v1/groups/:id/members`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                                      | 期待結果                  |
| --- | -------- | ----------------------------------------------- | ------------------------- |
| 1   | 正常系   | 複数ユーザー一括削除                            | 204 No Content            |
| 2   | 異常系   | id が文字列                                     | 400 Bad Request           |
| 3   | 境界値   | id = 0                                          | 400 Bad Request           |
| 4   | 境界値   | id が負数                                       | 400 Bad Request           |
| 5   | 異常系   | user_ids が空                                   | 400 Bad Request           |
| 6   | 異常系   | service が ErrNotFound を返す（グループ未存在） | 404 Not Found             |
| 7   | 異常系   | service が ErrNotFound を返す（非メンバー含む） | 404 Not Found             |
| 8   | 例外処理 | service が ErrInternalServerError を返す        | 500 Internal Server Error |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                                                     | 期待結果               |
| --- | -------- | -------------------------------------------------------------- | ---------------------- |
| 9   | 正常系   | 単一メンバー削除                                               | nil を返す             |
| 10  | 正常系   | 複数メンバー一括削除                                           | nil を返す             |
| 11  | 異常系   | グループが存在しない                                           | ErrNotFound            |
| 12  | 異常系   | 非メンバーが含まれる（Repository が ErrNotFound を返す）       | ErrNotFound            |
| 13  | 例外処理 | Repository が DB エラーを返す                                  | ErrInternalServerError |
| 14  | 正常系   | user_ids が 1 件                                               | nil を返す             |
| 15  | 正常系   | 重複 ID は自動排除されて 1 件で削除が呼ばれる                  | nil を返す             |
| 16  | 正常系   | インターフェース経由でモックのみが呼ばれる（実 DB 非接触確認） | nil を返す             |

---

## 要件

1. グループから複数メンバーを一括削除できる
2. 重複 ID はサービス層で自動排除する
3. 指定ユーザーの一部でもメンバーでない場合は 404（ロールバック）
4. グループが存在しない場合は 404

---

## 対象外

- メンバーの追加（→ add-group-members）
- グループ自体の削除（→ delete-group）
