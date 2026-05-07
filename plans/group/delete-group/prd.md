# PRD: delete-group

## 概要

| 項目         | 内容                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 機能名       | `delete-group`                                                                                                         |
| 目的         | グループを物理削除せず `deleted_at` に削除日時をセットすることで、データを保持しつつグループを「削除済み」状態にできる |
| API          | `DELETE /api/v1/groups/:id`                                                                                            |
| 認証         | 必要（AuthMiddleware）                                                                                                 |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                                         |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `DELETE /api/v1/groups/:id`

#### リクエスト仕様

**パスパラメータ**

| フィールド | 型             | 必須 | 説明                    |
| ---------- | -------------- | ---- | ----------------------- |
| `id`       | integer (path) | ✓    | グループの ID。正の整数 |

**リクエストボディ**: なし

#### バリデーション一覧

| #   | 対象フィールド | ルール                                                  | エラー時の挙動  |
| --- | -------------- | ------------------------------------------------------- | --------------- |
| 1   | `id`           | 整数に変換できること                                    | 400 Bad Request |
| 2   | `id`           | 1 以上（正の整数）であること                            | 400 Bad Request |
| 3   | `id`           | DB 上に該当グループが存在すること（削除済みでないこと） | 404 Not Found   |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `DELETE /api/v1/groups/:id`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

#### バックエンド処理フロー

```
1. 開始
2. パスパラメータ id を取得してパースする
   - パース失敗または 0 以下の場合 → 400 Bad Request { "message": "given param is not valid" } → 終了
3. コンテキストから認証済みユーザー情報を取得する
   - 取得失敗 → 401 Unauthorized { "message": "Unauthorized" } → 終了
4. グループ削除をサービス層に委譲する
5. サービス層で id が 1 未満かどうかを確認する
   - 1 未満の場合 → 400 Bad Request → 終了
6. 削除済みでないグループを論理削除する（deleted_at に現在時刻をセット、updated_by に認証ユーザー ID をセット）
   - 更新対象が 0 件（グループが存在しないまたは削除済み）→ 404 Not Found { "message": "your requested item is not found" } → 終了
   - DB エラーの場合 → 500 Internal Server Error { "message": "internal server error" } → 終了
7. 204 No Content を返す（レスポンスボディなし）→ 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### エンドポイント: `DELETE /api/v1/groups/:id`

凡例: `→` = 次の処理へ進む / 終了 = 処理終了

```
1. 開始
2. GroupDetailContent に [Delete] ボタンを配置する（Edit ボタンと右端に Flex gap="2" でグループ化、useDeleteGroup フックを使用）
3. [Delete] クリックで AlertDialog を開く
4. ダイアログ内に削除の確認メッセージを表示する
5. キャンセルボタンをクリックする → ダイアログを閉じる → 終了
6. 確認ボタンをクリックする → DELETE /api/v1/groups/:id を送信する（isLoading 中は確認ボタンを非活性にする）
7. レスポンス受信
   - 成功（204）→ ダイアログを閉じる → グループ一覧画面（/）へ遷移する → 終了
   - 失敗 → ダイアログ内にエラーメッセージを表示する（ダイアログは開いたまま）→ 終了
```

> `apiFetch` は `res.status === 204` の場合に `res.json()` を呼ばず `undefined` を返す（`apiFetch<void>` を使用）。

---

## 確認ステップ 5-3: ファイル配置

**原則: 関与した全ファイルを列挙し、役割は具体的に書く。**

### sample-api

| 対応ステップ  | パス                                                                   | 役割                                                                                              |
| ------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 5-2           | `group/service.go`                                                     | `GroupRepository` IF の `Delete(id, userID uint64)` 定義・`Service.Delete` ロジック               |
| 5-5           | `group/service_test.go`                                                | `Delete` Service ユニットテスト（userID の渡し確認を含む）                                        |
| 5-5           | `group/mocks/group_repository_mock.go`                                 | `Delete` mock（`userID uint64` を受け取る）                                                       |
| 5-1, 5-2, 5-4 | `internal/rest/group.go`                                               | `GroupService` IF の `Delete(id, userID uint64)` 定義・ハンドラで authUser を取得し userID を渡す |
| 5-5           | `internal/rest/group_test.go`                                          | `Delete` Handler ユニットテスト（authUser セット・401 ケースを含む）                              |
| 5-5           | `internal/rest/mocks/group_service_mock.go`                            | `Delete` mock（`userID uint64` を受け取る）                                                       |
| 5-3           | `internal/repository/mysql/group.go`                                   | `Delete(id, userID uint64)` 実装（SQL に `updated_by = ?` を含む）                                |
| 5-5           | `internal/repository/mysql/group_test.go`                              | `Delete` integration テスト（`deleted_at` + `updated_by` の検証を含む）                           |
| 5-3           | `sample-api/db/migrate/20260417130000_add_updated_by_to_groups.up.sql` | `groups.updated_by` カラム追加・FK 設定（golang-migrate）                                         |

### sample-front

| 対応ステップ | パス                                                             | 役割                                                                   |
| ------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 5-2-FE       | `src/pages/group-detail/api/delete-group.ts`                     | 新規: `apiFetch<void>` で DELETE /api/v1/groups/:id を呼ぶ関数         |
| 5-2-FE       | `src/pages/group-detail/model/useDeleteGroup.ts`                 | 新規: `useDeleteGroup` フック（isLoading・error・onSuccess・navigate） |
| 5-2-FE       | `src/pages/group-detail/ui/DeleteGroupDialog.tsx`                | 新規: Radix UI AlertDialog 確認ダイアログコンポーネント                |
| 5-2-FE       | `src/pages/group-detail/ui/GroupDetailContent.tsx`               | `[Delete]` ボタン追加・Edit/Delete を `<Flex gap="2">` でグループ化    |
| 5-5          | `src/pages/group-detail/ui/__tests__/DeleteGroupDialog.test.tsx` | 新規: AlertDialog テスト                                               |
| 5-5          | `src/pages/group-detail/model/__tests__/useDeleteGroup.test.ts`  | 新規: フックテスト                                                     |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `DELETE /api/v1/groups/:id`

### レスポンス（正常系）

- ステータス: `204 No Content`
- ボディ: なし

### エラーケース一覧

| 条件                                     | 発生レイヤー                       | ステータス                | レスポンス                                          |
| ---------------------------------------- | ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可                    | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                           | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| authUser 取得失敗                        | Handler                            | 401 Unauthorized          | `{ "message": "Unauthorized" }`                     |
| 対象グループが存在しない（削除済み含む） | Repository                         | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー                                | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| ネットワークエラー                       | フロントエンド: API クライアント層 | —                         | ダイアログ内にエラーメッセージ表示                  |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `DELETE /api/v1/groups/:id`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                                    | 期待結果                  |
| --- | -------- | --------------------------------------------- | ------------------------- |
| 1   | 正常系   | authUser あり + 存在する id で削除            | 204 No Content            |
| 2   | 異常系   | authUser が取得できない（型アサーション失敗） | 401 Unauthorized          |
| 3   | 異常系   | id が文字列                                   | 400 Bad Request           |
| 4   | 境界値   | id = 0                                        | 400 Bad Request           |
| 5   | 異常系   | service が ErrNotFound を返す                 | 404 Not Found             |
| 6   | 例外処理 | service が ErrInternalServerError を返す      | 500 Internal Server Error |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                                    | 期待結果               |
| --- | -------- | --------------------------------------------- | ---------------------- |
| 7   | 境界値   | id = 0（最小境界外）                          | ErrBadParamInput       |
| 8   | 正常系   | 削除成功（userID が正しく渡されることを確認） | nil を返す             |
| 9   | 異常系   | Repository が ErrNotFound を返す              | ErrNotFound            |
| 10  | 例外処理 | Repository が DB エラーを返す                 | ErrInternalServerError |

**FE: DeleteGroupDialog テスト** (`pages/group-detail/ui/__tests__/DeleteGroupDialog.test.tsx`):

| #   | 観点   | テスト内容                                         | 期待結果                |
| --- | ------ | -------------------------------------------------- | ----------------------- |
| 1   | 正常系 | Delete ボタンクリックで確認ダイアログが開く        | ダイアログ表示確認      |
| 2   | 正常系 | ダイアログ内の確認ボタンで DELETE API が呼ばれる   | DELETE API 呼び出し確認 |
| 3   | 正常系 | API 成功時に navigate('/') が呼ばれる              | リダイレクト確認        |
| 4   | 異常系 | API エラー時にダイアログ内にエラーメッセージを表示 | エラーメッセージ表示    |

**FE: useDeleteGroup テスト** (`pages/group-detail/model/__tests__/useDeleteGroup.test.ts`):

| #   | 観点   | テスト内容                                    | 期待結果       |
| --- | ------ | --------------------------------------------- | -------------- |
| 5   | 正常系 | デフォルト状態（isLoading=false, error=null） | 初期状態確認   |
| 6   | 正常系 | submit 後 isLoading=true になる               | isLoading 確認 |
| 7   | 正常系 | API 成功時に onSuccess コールバックが呼ばれる | onSuccess 確認 |

---

## 要件

1. `DELETE /api/v1/groups/:id` エンドポイントを新規追加する
2. リクエスト: path `id`（整数・1 以上）、リクエストボディなし
3. `id` が整数に変換できない場合、または 1 未満の場合は 400 を返す
4. 対象グループが存在しない（または既に論理削除済み）場合は 404 を返す
5. 論理削除: `UPDATE groups SET deleted_at = NOW(), updated_by = ? WHERE id = ? AND deleted_at IS NULL` を実行する
6. Affected rows = 0 の場合は `domain.ErrNotFound` を返す
7. 成功時は `204 No Content` を返す（レスポンスボディなし）
8. DB エラー時は 500 を返す
9. スキーマ変更なし（`groups.deleted_at` カラムは既存）
10. グループ詳細画面（`GroupDetailContent`）に `[Delete]` ボタンを配置する（フルページ・シート表示の両方）
11. `[Delete]` クリックで Radix UI `AlertDialog`（確認ダイアログ）を開く
12. ダイアログ内の確認ボタンクリック時に `DELETE /api/v1/groups/:id` を呼び出す
13. API 呼び出し中は確認ボタンを `disabled` にする
14. 成功時はダイアログを閉じ、グループ一覧画面（`/`）へ `navigate` する
15. API エラー時はダイアログ内にエラーメッセージを表示する（ダイアログは開いたまま）

---

## 対象外

- グループの物理削除
- 削除済みグループの復元
- メンバーの削除（グループ削除時のカスケード処理なし）
