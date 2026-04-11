# PRD: update-group

## 概要

| 項目         | 内容                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| 機能名       | `update-group`                                                                                           |
| 目的         | グループ詳細画面からグループの基本情報（name / description）を編集できる                                 |
| API          | `PUT /api/v1/groups/:id`                                                                                 |
| 認証         | 不要                                                                                                     |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                           |

---

## 最低要件

1. `PUT /api/v1/groups/:id` エンドポイントを新規追加する
2. リクエスト: path `id`（整数・1 以上）、body `{ "name": string, "description": string }`
3. `name` は前後空白トリム後 1〜100 文字でなければ 400 を返す
4. `description` は任意（空文字可）
5. 対象グループが存在しない場合は 404 を返す
6. 保存成功時は 200 + 更新後の Group（id, name, description, member_count）を返す
7. DB エラー時は 500 を返す
8. グループ詳細ページ（フルページ・シート表示の両方）に `[Edit]` ボタンを配置する
9. `[Edit]` クリックで Radix UI Dialog が開き、現在の name / description が初期値として表示される
10. Save クリック時に FE バリデーション（name 空 / 100 文字超 → インライン表示）を実行する
11. バリデーション通過後に `PUT /api/v1/groups/:id` を呼び出す
12. API 呼び出し中は Save ボタンを disabled にする
13. 成功時はダイアログを閉じ、グループ詳細データを再取得して画面を更新する
14. API エラー時はダイアログ内にエラーメッセージを表示する（ダイアログは開いたまま）

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `PUT /api/v1/groups/:id`

#### リクエスト仕様

**パスパラメータ**

| フィールド | 型             | 必須 | 説明                    |
| ---------- | -------------- | ---- | ----------------------- |
| `id`       | integer (path) | ✓    | グループの ID。正の整数 |

**リクエストボディ**

| フィールド    | 型     | 必須 | 説明                               |
| ------------- | ------ | ---- | ---------------------------------- |
| `name`        | string | ✓    | グループ名。前後空白トリム後 1〜100 文字 |
| `description` | string | —    | 任意（空文字可）                   |

#### バリデーション一覧

| #   | 対象フィールド | ルール                                   | エラー時の挙動  |
| --- | -------------- | ---------------------------------------- | --------------- |
| 1   | `id`           | 整数に変換できること                     | 400 Bad Request |
| 2   | `id`           | 1 以上（正の整数）であること             | 400 Bad Request |
| 3   | `id`           | DB 上に該当グループが存在すること        | 404 Not Found   |
| 4   | `name`         | 前後空白トリム後に 1 文字以上であること  | 400 Bad Request |
| 5   | `name`         | トリム後 100 文字以内であること          | 400 Bad Request |

---

## 確認ステップ 5-2: 処理フロー

### エンドポイント: `PUT /api/v1/groups/:id`

#### バックエンド処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（PUT /api/v1/groups/:id）を受信
3. パスパラメータ id を c.Param("id") で取得
4. id を整数にパース
   - パース失敗の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
5. id < 1 の場合
   - 400 Bad Request { "message": "given param is not valid" } を返す
   - 終了
6. リクエストボディを c.Bind(&req) でパース
   - Bind 失敗の場合
      - 400 Bad Request { "message": "<Bind エラーメッセージ>" } を返す
      - 終了
7. Service.Update(ctx, id, req.Name, req.Description) を呼び出す
8. Service 層で strings.TrimSpace(name) を適用
   - トリム後 name が空、または 100 文字超の場合
      - domain.ErrBadParamInput を返す（→ 400 Bad Request）
      - 終了
9. Repository.Update(ctx, id, name, description) を呼び出す
10. DB: groups テーブルで id に一致するレコードを UPDATE（deleted_at IS NULL）
    - Affected rows = 0 の場合
       - domain.ErrNotFound を返す（→ 404 Not Found）
       - 終了
    - DB エラーの場合
       - domain.ErrInternalServerError を返す（→ 500 Internal Server Error）
       - 終了
11. 更新後のグループ情報を取得して返却
12. 200 OK + JSON を返す
13. 終了
```

#### フロントエンド処理フロー

```
1. 開始
2. GroupDetailContent に [Edit] ボタンを追加
3. [Edit] クリックで EditGroupDialog を開く
   - 現在の group.name / group.description を初期値として表示
4. ユーザーが name / description を編集
5. Save ボタンクリック
6. FE バリデーション実行
   - name が空（トリム後空含む）→ インライン表示（"Name is required"）
   - name が 101 文字以上 → インライン表示（"Name must be 100 characters or less"）
7. バリデーション通過 → PUT /api/v1/groups/:id を呼び出す
8. 送信中は Save ボタンを disabled にする（isLoading）
9. 成功時
   - ダイアログを閉じる
   - グループ詳細データを再取得して画面を更新
10. API エラー時
    - ダイアログ内にエラーメッセージを表示する（ダイアログは開いたまま）
11. 終了
```

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md](../../schema.md) を参照。

スキーマ変更なし。UPDATE のみ追加。

```sql
UPDATE `groups`
SET name = ?, description = ?
WHERE id = ? AND deleted_at IS NULL
```

| カラム        | 値               |
| ------------- | ---------------- |
| `name`        | トリム済み入力値 |
| `description` | 入力値           |

> Affected rows = 0 の場合は `domain.ErrNotFound` を返す。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `PUT /api/v1/groups/:id`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "id": 1,
  "name": "updated-name",
  "description": "更新後の説明",
  "member_count": 5
}
```

### エラーケース一覧

| 条件                           | 発生レイヤー                       | ステータス                | レスポンス                                          |
| ------------------------------ | ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可          | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                 | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| JSON パース失敗（Bind エラー） | Handler                            | 400 Bad Request           | `{ "message": "<Bind エラーメッセージ>" }`          |
| name 空 / トリム後空 / 100 文字超過 | Service                       | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| 該当グループが存在しない       | Repository                         | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー                      | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| ネットワークエラー             | フロントエンド: API クライアント層 | —                         | ダイアログ内にエラーメッセージ表示                  |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `PUT /api/v1/groups/:id`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点   | テスト内容                                               | 期待結果                   |
| --- | ------ | -------------------------------------------------------- | -------------------------- |
| 1   | 正常系 | 存在する id + 有効な name/description                    | 200 OK + Group JSON        |
| 2   | 異常系 | id が文字列                                              | 400 Bad Request            |
| 3   | 異常系 | id = 0                                                   | 400 Bad Request            |
| 4   | 異常系 | service が ErrBadParamInput を返す                       | 400 Bad Request            |
| 5   | 異常系 | service が ErrNotFound を返す                            | 404 Not Found              |
| 6   | 異常系 | service が ErrInternalServerError を返す                 | 500 Internal Server Error  |

**Service テスト** (`group/service_test.go`):

| #   | 観点   | テスト内容                                               | 期待結果                   |
| --- | ------ | -------------------------------------------------------- | -------------------------- |
| 7   | 正常系 | 有効な name/description → repository.Update 成功        | 更新後 Group を返す        |
| 8   | 正常系 | name 前後スペース → トリム後で repository.Update が呼ばれる | 更新後 Group を返す     |
| 9   | 異常系 | name 空文字                                              | ErrBadParamInput           |
| 10  | 異常系 | name スペースのみ（トリム後空）                          | ErrBadParamInput           |
| 11  | 異常系 | name 101 文字                                            | ErrBadParamInput           |
| 12  | 異常系 | repository.Update がエラー                               | ErrInternalServerError     |

**Repository テスト** (`internal/repository/mysql/group_test.go`):

| #   | 観点   | テスト内容                                               | 期待結果                   |
| --- | ------ | -------------------------------------------------------- | -------------------------- |
| 13  | 正常系 | UPDATE 成功 → 更新後 Group を返す（integration test）   | Group                      |
| 14  | 異常系 | 存在しない id → ErrNotFound                             | ErrNotFound                |

**FE: EditGroupDialog テスト** (`pages/group-detail/ui/__tests__/EditGroupDialog.test.tsx`):

| #   | 観点   | テスト内容                                               | 期待結果                   |
| --- | ------ | -------------------------------------------------------- | -------------------------- |
| 1   | 正常系 | ダイアログ開時に現在の name/description が初期値表示     | 初期値表示確認             |
| 2   | 異常系 | name 空で Save 押下 → インラインエラー表示               | エラーメッセージ表示       |
| 3   | 異常系 | name 101 文字で Save → インラインエラー表示              | エラーメッセージ表示       |
| 4   | 正常系 | 正常入力で Save 押下 → PUT API が呼ばれる                | API 呼び出し確認           |
| 5   | 正常系 | API 成功 → ダイアログが閉じる                            | 閉じる確認                 |
| 6   | 異常系 | API エラー → ダイアログ内にエラーメッセージ表示          | エラーメッセージ表示       |

**FE: useUpdateGroup テスト** (`pages/group-detail/model/__tests__/useUpdateGroup.test.ts`):

| #   | 観点   | テスト内容                                               | 期待結果                   |
| --- | ------ | -------------------------------------------------------- | -------------------------- |
| 7   | 正常系 | デフォルト状態（isLoading=false, error=null）            | 初期状態確認               |
| 8   | 正常系 | submit 後 isLoading=true になる                          | isLoading 確認             |
| 9   | 正常系 | API 成功時に onSuccess コールバックが呼ばれる            | onSuccess 確認             |

---

## ファイル配置

### sample-api

| ファイル                                               | 変更内容                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `group/service.go`                                     | `GroupRepository` IF に `Update` 追加・`Service.Update` 実装             |
| `group/service_test.go`                                | `Update` のテスト追加                                                    |
| `group/mocks/group_repository_mock.go`                 | `Update` mock メソッド追加                                               |
| `internal/rest/group.go`                               | `GroupService` IF に `Update` 追加・`updateGroupRequest` 型定義・PUT ルート登録・`Update` ハンドラ実装 |
| `internal/rest/group_test.go`                          | `Update` ハンドラのテスト追加                                            |
| `internal/rest/mocks/group_service_mock.go`            | `Update` mock メソッド追加                                               |
| `internal/repository/mysql/group.go`                   | `Update` メソッド追加（UPDATE + RowsAffected チェック → 更新後 Group を返す）                  |
| `internal/repository/mysql/group_test.go`              | `Update` integration テスト追加                                          |

### sample-front

| ファイル                                                             | 変更内容                                                  |
| -------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/pages/group-detail/api/update-group.ts`                         | 新規: PUT /api/v1/groups/:id 呼び出し関数                 |
| `src/pages/group-detail/model/group-update.ts`                       | 新規: `UpdateGroupRequest` 型定義                         |
| `src/pages/group-detail/model/useUpdateGroup.ts`                     | 新規: `useUpdateGroup` フック（フォーム状態・バリデーション・API 呼び出し） |
| `src/pages/group-detail/model/useGroupDetail.ts`                     | `refetchKey` state 追加 + `refetch()` 関数 export         |
| `src/pages/group-detail/ui/EditGroupDialog.tsx`                      | 新規: Radix Dialog 編集モーダルコンポーネント             |
| `src/pages/group-detail/ui/GroupDetailContent.tsx`                   | `[Edit]` ボタン追加・`EditGroupDialog` の呼び出し         |
| `src/pages/group-detail/ui/__tests__/EditGroupDialog.test.tsx`       | 新規: モーダルテスト                                      |
| `src/pages/group-detail/model/__tests__/useUpdateGroup.test.ts`      | 新規: フックテスト                                        |

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- グループの削除
- メンバーの追加・削除
