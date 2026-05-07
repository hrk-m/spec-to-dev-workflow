# PRD: delete-subgroup

## 概要

| 項目         | 内容                                             |
| ------------ | ------------------------------------------------ |
| 機能名       | `delete-subgroup`                                |
| 目的         | グループのツリー構造から特定の親子関係を解除する |
| API          | `DELETE /api/v1/groups/:id/subgroups/:childId`   |
| 認証         | 必要（AuthMiddleware）                           |
| データソース | MySQL (`sample-api/internal/repository/mysql`)   |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `DELETE /api/v1/groups/:id/subgroups/:childId`

**リクエスト仕様**

| フィールド       | 型      | 必須 | 説明                      |
| ---------------- | ------- | ---- | ------------------------- |
| `id` (path)      | integer | ✓    | 親グループ ID（正の整数） |
| `childId` (path) | integer | ✓    | 子グループ ID（正の整数） |

**バリデーション一覧**

| #   | 対象フィールド   | ルール                                                                                           | エラー時の挙動   |
| --- | ---------------- | ------------------------------------------------------------------------------------------------ | ---------------- |
| 1   | `id` (path)      | 整数に変換できること                                                                             | 400 Bad Request  |
| 2   | `id` (path)      | 1 以上の正の整数であること                                                                       | 400 Bad Request  |
| 3   | `childId` (path) | 整数に変換できること                                                                             | 400 Bad Request  |
| 4   | `childId` (path) | 1 以上の正の整数であること                                                                       | 400 Bad Request  |
| 5   | 認証             | コンテキストから `authUser` を取得できること                                                     | 401 Unauthorized |
| 6   | 存在チェック     | 対象の親子関係 `(parent_group_id, child_group_id)` が DB に存在すること（RowsAffected=0 で判定） | 404 Not Found    |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `DELETE /api/v1/groups/:id/subgroups/:childId`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

```
1. 開始
2. パスパラメータ :id (parent_group_id) を取得してパースする
   - パース失敗または 0 以下 → 400 Bad Request {"message": "given param is not valid"} → 終了
3. パスパラメータ :childId (child_group_id) を取得してパースする
   - パース失敗または 0 以下 → 400 Bad Request {"message": "given param is not valid"} → 終了
4. コンテキストから認証済みユーザー情報を取得する
   - 取得失敗 → 401 Unauthorized {"message": "Unauthorized"} → 終了
5. サービス層にサブグループ削除を委譲する
6. group_relations から (parent_group_id, child_group_id) を DELETE する
   - RowsAffected が 0（対象の関係が存在しない）
     → 404 Not Found {"message": "your requested item is not found"} → 終了
   - DB エラー → 500 Internal Server Error {"message": "internal server error"} → 終了
7. 204 No Content を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### サブグループ削除（SubgroupManagementSheet の [Delete] ボタン → 確認ダイアログ）

```
1. 開始
2. SubgroupManagementSheet の行の [Delete] ボタン押下
3. 削除対象のサブグループ ID を state にセットし、確認ダイアログ（AlertDialog）を開く
   - Title: "Delete Subgroup"
   - Description: "Are you sure you want to delete this subgroup? This action cannot be undone."
   - Cancel ボタン（gray, radius="full"）→ ダイアログを閉じる → 終了
   - Delete ボタン（red, radius="full"）→ 4 へ進む
4. DELETE /api/v1/groups/:id/subgroups/:childId を送信する
5. レスポンスは成功？
   - Yes（204）→
     6. ダイアログを閉じる
     7. サブグループ一覧を再取得する
     8. 終了
   - No（404: 対象の関係が存在しない）→
     6. ダイアログ内にエラーメッセージを表示する（ダイアログは閉じない）
     7. 終了
   - No（4xx・5xx）→
     6. ダイアログ内に汎用エラーメッセージを表示する（ダイアログは閉じない）
     7. 終了
```

---

## 確認ステップ 5-3: ファイル配置

### sample-api

| ファイル                                                   | 役割                                                                                                                                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `sample-api/group/service.go`                              | `GroupRelationRepository` IF（`DeleteRelation` を含む）・`GroupService.DeleteSubGroup` ロジック                                     |
| `sample-api/group/service_test.go`                         | `DeleteSubGroup` Service ユニットテスト                                                                                             |
| `sample-api/group/mocks/group_relation_repository_mock.go` | `GroupRelationRepository` の手動 mock（`DeleteRelation` を含む）                                                                    |
| `sample-api/internal/rest/group.go`                        | `DeleteSubGroup` ハンドラ・`GroupService` IF（`DeleteSubGroup` を含む）・ルート登録（DELETE /api/v1/groups/:id/subgroups/:childId） |
| `sample-api/internal/rest/group_test.go`                   | `DeleteSubGroup` Handler ユニットテスト                                                                                             |
| `sample-api/internal/rest/mocks/group_service_mock.go`     | `GroupService` の手動 mock（`DeleteSubGroup` を含む）                                                                               |
| `sample-api/internal/repository/mysql/group_relation.go`   | `GroupRelationRepository` の MySQL 実装（`DeleteRelation` を含む）                                                                  |

### sample-front

| ファイル                                                             | 役割                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `sample-front/src/pages/group-detail/api/delete-subgroup.ts`         | DELETE /api/v1/groups/:id/subgroups/:childId fetch 関数             |
| `sample-front/src/pages/group-detail/model/useDeleteSubgroup.ts`     | 削除ロジック・loading・error を管理するカスタムフック               |
| `sample-front/src/pages/group-detail/ui/DeleteSubgroupDialog.tsx`    | サブグループ削除を確認する AlertDialog コンポーネント               |
| `sample-front/src/pages/group-detail/ui/SubgroupManagementSheet.tsx` | [Delete] ボタン・`deletingSubgroupId` state                         |
| `sample-front/src/pages/group-detail/ui/GroupDetailContent.tsx`      | SubgroupManagementSheet に `groupId`・`refetch` を props として渡す |

> DB スキーマ（`group_relations` テーブル定義・制約・FK）の詳細は [plans/schema.md](../../schema.md) を参照。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `DELETE /api/v1/groups/:id/subgroups/:childId`

### レスポンス（正常系）

- ステータス: `204 No Content`（ボディなし）

### エラーケース一覧

| 条件                       | 発生レイヤー | ステータス                | レスポンス                                        | FE 表示箇所                        |
| -------------------------- | ------------ | ------------------------- | ------------------------------------------------- | ---------------------------------- |
| `id` が整数に変換不可      | Handler      | 400 Bad Request           | `{"message": "given param is not valid"}`         | ダイアログ内インライン表示         |
| `id` が 0 以下             | Handler      | 400 Bad Request           | `{"message": "given param is not valid"}`         | ダイアログ内インライン表示         |
| `childId` が整数に変換不可 | Handler      | 400 Bad Request           | `{"message": "given param is not valid"}`         | ダイアログ内インライン表示         |
| `childId` が 0 以下        | Handler      | 400 Bad Request           | `{"message": "given param is not valid"}`         | ダイアログ内インライン表示         |
| `authUser` 取得失敗        | Handler      | 401 Unauthorized          | `{"message": "Unauthorized"}`                     | ダイアログ内インライン表示         |
| 対象の親子関係が存在しない | Repository   | 404 Not Found             | `{"message": "your requested item is not found"}` | ダイアログ内インライン表示         |
| DB エラー                  | Repository   | 500 Internal Server Error | `{"message": "internal server error"}`            | ダイアログ内インライン表示（汎用） |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `DELETE /api/v1/groups/:id/subgroups/:childId`

**FE コンポーネントテスト** (`pages/group-detail/ui/__tests__/SubgroupManagementSheet.test.tsx` 更新):

| #   | 観点       | テスト内容                          | 期待結果                                                           |
| --- | ---------- | ----------------------------------- | ------------------------------------------------------------------ |
| 1   | 正常系     | [Delete] 押下 → ダイアログが開く    | AlertDialog が表示される                                           |
| 2   | 正常系     | ダイアログの Delete 押下 → 204 成功 | ダイアログが閉じ、一覧が再取得される                               |
| 3   | 異常系     | ダイアログの Delete 押下 → 404 返却 | ダイアログ内にエラーメッセージが表示される（ダイアログは閉じない） |
| 4   | 例外処理   | ダイアログの Delete 押下 → 500 返却 | ダイアログ内に汎用エラーメッセージが表示される                     |
| 5   | キャンセル | ダイアログの Cancel 押下            | ダイアログが閉じ、API は呼ばれない                                 |

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                                      | 入力例             | 期待結果                  |
| --- | -------- | ----------------------------------------------- | ------------------ | ------------------------- |
| 1   | 正常系   | 存在する親子関係を削除する                      | id=1, childId=2    | 204 No Content            |
| 2   | 異常系   | `authUser` を取得できない（型アサーション失敗） | —                  | 401 Unauthorized          |
| 3   | 異常系   | id が文字列                                     | id=abc             | 400 Bad Request           |
| 4   | 境界値   | id=0（最小境界外）                              | id=0               | 400 Bad Request           |
| 5   | 異常系   | childId が文字列                                | childId=abc        | 400 Bad Request           |
| 6   | 境界値   | childId=0（最小境界外）                         | childId=0          | 400 Bad Request           |
| 7   | 異常系   | service が ErrNotFound を返す                   | 存在しない親子関係 | 404 Not Found             |
| 8   | 例外処理 | service が ErrInternalServerError を返す        | DB エラー          | 500 Internal Server Error |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                                   | 入力例               | 期待結果               |
| --- | -------- | -------------------------------------------- | -------------------- | ---------------------- |
| 9   | 正常系   | 存在する親子関係を削除する                   | parent=1, child=2    | nil（削除成功）        |
| 10  | 異常系   | 対象の親子関係が存在しない（RowsAffected=0） | 存在しない組み合わせ | ErrNotFound            |
| 11  | 例外処理 | repository が DB エラーを返す                | mock がエラーを返す  | ErrInternalServerError |
| 12  | 境界値   | parentGroupID が 0（invalid）                | parent=0, child=2    | ErrBadParamInput       |
| 13  | 境界値   | childGroupID が 0（invalid）                 | parent=1, child=0    | ErrBadParamInput       |
| 14  | 異常系   | parent と child が同一 ID（自己参照）        | parent=1, child=1    | ErrBadParamInput       |

---

## 要件

1. `DELETE /api/v1/groups/:id/subgroups/:childId` エンドポイントが実装されている
2. `id`（parent_group_id）と `childId`（child_group_id）をパスパラメータから取得する
3. `id` または `childId` が整数に変換できない / 0 以下の場合は 400 を返す
4. 対象の親子関係 `(parent_group_id, child_group_id)` が DB に存在しない場合は 404 を返す
5. 削除成功時は 204 No Content を返す（ボディなし）
6. 存在チェックと DELETE を 1 回の SQL で実行し、RowsAffected=0 で 404 を判定する
7. 各バリデーションで使用するエラーセンチネル: `ErrNotFound`（404）・`ErrInternalServerError`（500）
8. SubgroupManagementSheet の各行に [Delete] ボタンを表示し、押下で確認ダイアログを開く
9. 確認ダイアログ（AlertDialog）は Title `"Delete Subgroup"`・Description `"Are you sure you want to delete this subgroup? This action cannot be undone."` を表示する
10. Cancel ボタンでダイアログを閉じ、削除をキャンセルできる
11. Delete ボタン押下で API を送信し、成功時はダイアログを閉じて一覧を再取得する
12. API エラー時はダイアログ内にインラインエラーを表示し、ダイアログは閉じない

---

## 対象外

- 権限チェック（認証済みユーザーなら全員操作可）
- カスケード削除（子グループのさらに下の関係は維持する）
