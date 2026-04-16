# PRD: delete-group

## 概要

| 項目         | 内容                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| 機能名       | `delete-group`                                                                                           |
| 目的         | グループを物理削除せず `deleted_at` に削除日時をセットすることで、データを保持しつつグループを「削除済み」状態にできる |
| API          | `DELETE /api/v1/groups/:id`                                                                              |
| 認証         | 必要（AuthMiddleware）                                                                                   |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                           |

---

## 最低要件

1. `DELETE /api/v1/groups/:id` エンドポイントを新規追加する
2. リクエスト: path `id`（整数・1 以上）、リクエストボディなし
3. `id` が整数に変換できない場合、または 1 未満の場合は 400 を返す
4. 対象グループが存在しない（または既に論理削除済み）場合は 404 を返す
5. 論理削除: `UPDATE groups SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL` を実行する
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

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `DELETE /api/v1/groups/:id`

#### リクエスト仕様

**パスパラメータ**

| フィールド | 型             | 必須 | 説明                    |
| ---------- | -------------- | ---- | ----------------------- |
| `id`       | integer (path) | ✓    | グループの ID。正の整数 |

**リクエストボディ**: なし

#### バリデーション一覧

| #   | 対象フィールド | ルール                                | エラー時の挙動  |
| --- | -------------- | ------------------------------------- | --------------- |
| 1   | `id`           | 整数に変換できること                  | 400 Bad Request |
| 2   | `id`           | 1 以上（正の整数）であること          | 400 Bad Request |
| 3   | `id`           | DB 上に該当グループが存在すること（削除済みでないこと） | 404 Not Found   |

---

## 確認ステップ 5-2: 処理フロー

### エンドポイント: `DELETE /api/v1/groups/:id`

#### バックエンド処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（DELETE /api/v1/groups/:id）を受信
3. パスパラメータ id を c.Param("id") で取得
4. id を整数にパース
   - パース失敗の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
5. id < 1 の場合
   - 400 Bad Request { "message": "given param is not valid" } を返す
   - 終了
6. Service.Delete(ctx, id) を呼び出す
7. Repository.Delete(ctx, id) を呼び出す
8. DB: UPDATE groups SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL を実行
   - Affected rows = 0 の場合
      - domain.ErrNotFound を返す（→ 404 Not Found）
      - 終了
   - DB エラーの場合
      - domain.ErrInternalServerError を返す（→ 500 Internal Server Error）
      - 終了
9. 204 No Content を返す（レスポンスボディなし）
10. 終了
```

#### フロントエンド処理フロー

```
1. 開始
2. GroupDetailContent に [Delete] ボタンを追加（Edit ボタンと右端に Flex gap="2" でグループ化）
3. [Delete] クリックで AlertDialog.Root を開く
4. ダイアログ内に「削除の確認」メッセージを表示
5. キャンセルボタン（AlertDialog.Cancel）クリック → ダイアログを閉じる
6. 確認ボタン（AlertDialog.Action 内）クリック
7. DELETE /api/v1/groups/:id を呼び出す（`apiFetch<void>` を使用）
8. 呼び出し中は確認ボタンを disabled にする（isLoading）
9. 成功時（204）
   - ダイアログを閉じる
   - useNavigate で "/" へ遷移する
10. API エラー時
    - ダイアログ内にエラーメッセージを表示する（ダイアログは開いたまま）
11. 終了
```

> **実装メモ**: `shared/api/client.ts` の `apiFetch` は `res.status === 204` の場合に `res.json()` を呼ばず `undefined` を返す。`delete-group.ts` では `apiFetch<void>` を使用する。エラー時のメッセージ形式は `"${status} ${statusText}"`（例: `"404 Not Found"`, `"500 Internal Server Error"`）。

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md](../../schema.md) を参照。

スキーマ変更なし。`groups` テーブルの `deleted_at` カラムは既存。

```sql
UPDATE `groups`
SET deleted_at = NOW()
WHERE id = ? AND deleted_at IS NULL
```

| 条件               | 返却値                    |
| ------------------ | ------------------------- |
| Affected rows ≥ 1  | nil（正常）               |
| Affected rows = 0  | `domain.ErrNotFound`      |
| DB エラー          | `domain.ErrInternalServerError` |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `DELETE /api/v1/groups/:id`

### レスポンス（正常系）

- ステータス: `204 No Content`
- ボディ: なし

### エラーケース一覧

| 条件                                          | 発生レイヤー                       | ステータス                | レスポンス                                          |
| --------------------------------------------- | ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可                         | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                                | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| 対象グループが存在しない（削除済み含む）      | Repository                         | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー                                     | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| ネットワークエラー                            | フロントエンド: API クライアント層 | —                         | ダイアログ内にエラーメッセージ表示                  |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `DELETE /api/v1/groups/:id`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点   | テスト内容                                               | 期待結果                   |
| --- | ------ | -------------------------------------------------------- | -------------------------- |
| 1   | 正常系 | 存在する id で削除                                       | 204 No Content             |
| 2   | 異常系 | id が文字列                                              | 400 Bad Request            |
| 3   | 異常系 | id = 0                                                   | 400 Bad Request            |
| 4   | 異常系 | service が ErrNotFound を返す                            | 404 Not Found              |
| 5   | 異常系 | service が ErrInternalServerError を返す                 | 500 Internal Server Error  |

**Service テスト** (`group/service_test.go`):

| #   | 観点   | テスト内容                                               | 期待結果                   |
| --- | ------ | -------------------------------------------------------- | -------------------------- |
| 6   | 正常系 | repository.Delete 成功                                   | nil を返す                 |
| 7   | 異常系 | repository.Delete が ErrNotFound を返す                  | ErrNotFound                |
| 8   | 異常系 | repository.Delete が DB エラー                           | ErrInternalServerError     |

**Repository テスト** (`internal/repository/mysql/group_test.go`, integration):

| #   | 観点   | テスト内容                                               | 期待結果                   |
| --- | ------ | -------------------------------------------------------- | -------------------------- |
| 9   | 正常系 | DELETE 成功 → deleted_at がセットされる（integration）  | nil                        |
| 10  | 異常系 | 存在しない id → ErrNotFound                             | ErrNotFound                |

**FE: DeleteGroupDialog テスト** (`pages/group-detail/ui/__tests__/DeleteGroupDialog.test.tsx`):

| #   | 観点   | テスト内容                                               | 期待結果                   |
| --- | ------ | -------------------------------------------------------- | -------------------------- |
| 1   | 正常系 | Delete ボタンクリックで確認ダイアログが開く              | ダイアログ表示確認         |
| 2   | 正常系 | ダイアログ内の確認ボタンで DELETE API が呼ばれる         | DELETE API 呼び出し確認    |
| 3   | 正常系 | API 成功時に navigate('/') が呼ばれる                    | リダイレクト確認           |
| 4   | 異常系 | API エラー時にダイアログ内にエラーメッセージを表示       | エラーメッセージ表示       |

**FE: useDeleteGroup テスト** (`pages/group-detail/model/__tests__/useDeleteGroup.test.ts`):

| #   | 観点   | テスト内容                                               | 期待結果                   |
| --- | ------ | -------------------------------------------------------- | -------------------------- |
| 5   | 正常系 | デフォルト状態（isLoading=false, error=null）            | 初期状態確認               |
| 6   | 正常系 | submit 後 isLoading=true になる                          | isLoading 確認             |
| 7   | 正常系 | API 成功時に onSuccess コールバックが呼ばれる            | onSuccess 確認             |

---

## ファイル配置

### sample-api

| ファイル                                               | 変更内容                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `group/service.go`                                     | `GroupRepository` IF に `Delete` 追加・`Service.Delete` 実装             |
| `group/service_test.go`                                | `Delete` のテスト追加                                                    |
| `group/mocks/group_repository_mock.go`                 | `Delete` mock メソッド追加                                               |
| `internal/rest/group.go`                               | `GroupService` IF に `Delete` 追加・DELETE ルート登録・`Delete` ハンドラ実装 |
| `internal/rest/group_test.go`                          | `Delete` ハンドラのテスト追加                                            |
| `internal/rest/mocks/group_service_mock.go`            | `Delete` mock メソッド追加                                               |
| `internal/repository/mysql/group.go`                   | `Delete` メソッド追加（UPDATE + RowsAffected チェック）                  |
| `internal/repository/mysql/group_test.go`              | `Delete` integration テスト追加                                          |

### sample-front

| ファイル                                                             | 変更内容                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/pages/group-detail/api/delete-group.ts`                         | 新規: `apiFetch<void>` で DELETE /api/v1/groups/:id を呼ぶ関数 |
| `src/pages/group-detail/model/useDeleteGroup.ts`                     | 新規: `useDeleteGroup` フック（isLoading・error・onSuccess・navigate） |
| `src/pages/group-detail/ui/DeleteGroupDialog.tsx`                    | 新規: Radix UI AlertDialog 確認ダイアログコンポーネント   |
| `src/pages/group-detail/ui/GroupDetailContent.tsx`                   | `[Delete]` ボタン追加・Edit/Delete を `<Flex gap="2">` でグループ化 |
| `src/pages/group-detail/ui/__tests__/DeleteGroupDialog.test.tsx`     | 新規: AlertDialog テスト                                  |
| `src/pages/group-detail/model/__tests__/useDeleteGroup.test.ts`      | 新規: フックテスト                                        |

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- グループの物理削除
- 削除済みグループの復元
- メンバーの削除（グループ削除時のカスケード処理なし）
