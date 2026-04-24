# PRD: update-group

## 概要

| 項目         | 内容                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| 機能名       | `update-group`                                                           |
| 目的         | グループ詳細画面からグループの基本情報（name / description）を編集できる |
| API          | `PUT /api/v1/groups/:id`                                                 |
| 認証         | 必要（AuthMiddleware）                                                   |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                           |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `PUT /api/v1/groups/:id`

#### リクエスト仕様

**パスパラメータ**

| フィールド | 型             | 必須 | 説明                    |
| ---------- | -------------- | ---- | ----------------------- |
| `id`       | integer (path) | ✓    | グループの ID。正の整数 |

**リクエストボディ**

| フィールド    | 型     | 必須 | 説明                                     |
| ------------- | ------ | ---- | ---------------------------------------- |
| `name`        | string | ✓    | グループ名。前後空白トリム後 1〜100 文字 |
| `description` | string | —    | 任意（空文字可）                         |

#### バリデーション一覧

| #   | 対象フィールド | ルール                                  | エラー時の挙動  |
| --- | -------------- | --------------------------------------- | --------------- |
| 1   | `id`           | 整数に変換できること                    | 400 Bad Request |
| 2   | `id`           | 1 以上（正の整数）であること            | 400 Bad Request |
| 3   | `id`           | DB 上に該当グループが存在すること       | 404 Not Found   |
| 4   | `name`         | 前後空白トリム後に 1 文字以上であること | 400 Bad Request |
| 5   | `name`         | トリム後 100 文字以内であること         | 400 Bad Request |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `PUT /api/v1/groups/:id`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

#### バックエンド処理フロー

```
1. 開始
2. パスパラメータ id を取得してパースする
   - パース失敗または 0 以下の場合 → 400 Bad Request { "message": "given param is not valid" } → 終了
3. リクエストボディを JSON としてデコードする
   - デコード失敗 → 400 Bad Request { "message": "<Bind エラーメッセージ>" } → 終了
4. コンテキストから認証済みユーザー情報を取得する
   - 取得失敗 → 401 Unauthorized { "message": "Unauthorized" } → 終了
5. グループ更新をサービス層に委譲する
6. サービス層で id が 1 未満かどうかを確認する
   - 1 未満の場合 → 400 Bad Request → 終了
7. サービス層で name の前後空白をトリムする
8. トリム後の name が空または 100 文字超の場合
   - → 400 Bad Request { "message": "given param is not valid" } → 終了
9. 削除済みでないグループを更新する（updated_by に認証ユーザー ID をセット）
   - 更新対象が 0 件（グループが存在しないまたは削除済み）→ 404 Not Found { "message": "your requested item is not found" } → 終了
   - DB エラーの場合 → 500 Internal Server Error { "message": "internal server error" } → 終了
10. 更新後のグループ情報を取得する
11. 200 OK + 更新後グループ JSON を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### エンドポイント: `PUT /api/v1/groups/:id`

凡例: `→` = 次の処理へ進む / 終了 = 処理終了

```
1. 開始
2. GroupDetailContent に [Edit] ボタンを配置する（useUpdateGroup フックを使用）
3. [Edit] クリックで EditGroupDialog を開く
   - 現在のグループ名と説明を初期値として表示する
4. ユーザーが name / description を編集する
5. Save ボタンをクリックする
6. フロントエンドバリデーションを実行する
   - name が空（トリム後空含む）→ インラインエラーを表示する → 終了
   - name が 101 文字以上 → インラインエラーを表示する → 終了
7. バリデーション通過 → PUT /api/v1/groups/:id を送信する（isLoading 中は Save ボタンを非活性にする）
8. レスポンス受信
   - 成功（200）→ ダイアログを閉じる → グループ詳細データを再取得して画面を更新する → 終了
   - 失敗 → ダイアログ内にエラーメッセージを表示する（ダイアログは開いたまま）→ 終了
```

---

## 確認ステップ 5-3: ファイル配置

→ [plans/schema.md](../../schema.md) を参照。

**原則: 関与した全ファイルを列挙し、役割は具体的に書く。**

### sample-api

| 対応ステップ  | パス                                                                   | 役割                                                                                                     |
| ------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 5-2           | `group/service.go`                                                     | `GroupRepository` IF の `Update` に `userID uint64` を追加・`Service.Update` シグネチャ更新              |
| 5-5           | `group/service_test.go`                                                | `Update` のテスト更新（userID 追加、正常系での渡し確認テスト追加）                                       |
| 5-5           | `group/mocks/group_repository_mock.go`                                 | `Update` mock の `userID uint64` を追加                                                                  |
| 5-1, 5-2, 5-4 | `internal/rest/group.go`                                               | `GroupService` IF の `Update` に `userID uint64` を追加・ハンドラで authUser 取得・401 返却・userID 渡し |
| 5-5           | `internal/rest/group_test.go`                                          | `Update` ハンドラのテスト更新（authUser セット・401 テスト追加）                                         |
| 5-5           | `internal/rest/mocks/group_service_mock.go`                            | `Update` mock の `userID uint64` を追加                                                                  |
| 5-3           | `internal/repository/mysql/group.go`                                   | `Update` の SQL に `updated_by = ?` を追加・シグネチャに `userID uint64` を追加                          |
| 5-5           | `internal/repository/mysql/group_test.go`                              | `Update` integration テスト更新（updated_by 検証追加）                                                   |
| 5-3           | `sample-api/db/migrate/20260417130000_add_updated_by_to_groups.up.sql` | `groups.updated_by` カラム追加・FK 設定（golang-migrate）                                                |

### sample-front

| 対応ステップ | パス                                                            | 役割                                                                            |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 5-2-FE       | `src/pages/group-detail/api/update-group.ts`                    | 新規: PUT /api/v1/groups/:id 呼び出し関数                                       |
| 5-2-FE       | `src/pages/group-detail/model/group-update.ts`                  | 新規: `UpdateGroupRequest` 型定義                                               |
| 5-2-FE       | `src/pages/group-detail/model/useUpdateGroup.ts`                | 新規: `useUpdateGroup` フック（フォーム状態・バリデーション・API 呼び出し）     |
| 5-2-FE       | `src/pages/group-detail/model/group-detail-state.ts`            | `refetchKey` state 追加 + `refetch()` 関数 export（`useGroupDetail` を export） |
| 5-2-FE       | `src/pages/group-detail/ui/EditGroupDialog.tsx`                 | 新規: Radix Dialog 編集モーダルコンポーネント                                   |
| 5-2-FE       | `src/pages/group-detail/ui/GroupDetailContent.tsx`              | `[Edit]` ボタン追加・`EditGroupDialog` の呼び出し                               |
| 5-5          | `src/pages/group-detail/ui/__tests__/EditGroupDialog.test.tsx`  | 新規: モーダルテスト                                                            |
| 5-5          | `src/pages/group-detail/model/__tests__/useUpdateGroup.test.ts` | 新規: フックテスト                                                              |

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

| 条件                                | 発生レイヤー                       | ステータス                | レスポンス                                          |
| ----------------------------------- | ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可               | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                      | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| JSON パース失敗（Bind エラー）      | Handler                            | 400 Bad Request           | `{ "message": "<Bind エラーメッセージ>" }`          |
| name 空 / トリム後空 / 100 文字超過 | Service                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| authUser 取得失敗                   | Handler                            | 401 Unauthorized          | `{ "message": "Unauthorized" }`                     |
| 該当グループが存在しない            | Repository                         | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー                           | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| ネットワークエラー                  | フロントエンド: API クライアント層 | —                         | ダイアログ内にエラーメッセージ表示                  |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `PUT /api/v1/groups/:id`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                                            | 期待結果                  |
| --- | -------- | ----------------------------------------------------- | ------------------------- |
| 1   | 正常系   | authUser あり + 存在する id + 有効な name/description | 200 OK + Group JSON       |
| 2   | 異常系   | authUser が取得できない（型アサーション失敗）         | 401 Unauthorized          |
| 3   | 異常系   | id が文字列                                           | 400 Bad Request           |
| 4   | 境界値   | id = 0                                                | 400 Bad Request           |
| 5   | 異常系   | service が ErrBadParamInput を返す（name 空）         | 400 Bad Request           |
| 6   | 異常系   | service が ErrNotFound を返す                         | 404 Not Found             |
| 7   | 例外処理 | service が ErrInternalServerError を返す              | 500 Internal Server Error |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                                           | 期待結果               |
| --- | -------- | ---------------------------------------------------- | ---------------------- |
| 8   | 正常系   | 有効な name/description/userID で更新成功            | 更新後 Group を返す    |
| 9   | 正常系   | name 前後スペース → トリム後の name で更新が呼ばれる | 更新後 Group を返す    |
| 10  | 正常系   | userID が更新処理に正しく渡される                    | 更新後 Group を返す    |
| 11  | 異常系   | name 空文字                                          | ErrBadParamInput       |
| 12  | 異常系   | name スペースのみ（トリム後空）                      | ErrBadParamInput       |
| 13  | 境界値   | name 101 文字                                        | ErrBadParamInput       |
| 14  | 境界値   | id = 0（最小境界外）                                 | ErrBadParamInput       |
| 15  | 例外処理 | Repository がエラーを返す                            | ErrInternalServerError |

**FE: EditGroupDialog テスト** (`pages/group-detail/ui/__tests__/EditGroupDialog.test.tsx`):

| #   | 観点   | テスト内容                                           | 期待結果             |
| --- | ------ | ---------------------------------------------------- | -------------------- |
| 1   | 正常系 | ダイアログ開時に現在の name/description が初期値表示 | 初期値表示確認       |
| 2   | 異常系 | name 空で Save 押下 → インラインエラー表示           | エラーメッセージ表示 |
| 3   | 異常系 | name 101 文字で Save → インラインエラー表示          | エラーメッセージ表示 |
| 4   | 正常系 | 正常入力で Save 押下 → PUT API が呼ばれる            | API 呼び出し確認     |
| 5   | 正常系 | API 成功 → ダイアログが閉じる                        | 閉じる確認           |
| 6   | 異常系 | API エラー → ダイアログ内にエラーメッセージ表示      | エラーメッセージ表示 |

**FE: useUpdateGroup テスト** (`pages/group-detail/model/__tests__/useUpdateGroup.test.ts`):

| #   | 観点   | テスト内容                                    | 期待結果       |
| --- | ------ | --------------------------------------------- | -------------- |
| 7   | 正常系 | デフォルト状態（isLoading=false, error=null） | 初期状態確認   |
| 8   | 正常系 | submit 後 isLoading=true になる               | isLoading 確認 |
| 9   | 正常系 | API 成功時に onSuccess コールバックが呼ばれる | onSuccess 確認 |

---

## 要件

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

## 対象外

- グループの削除
- メンバーの追加・削除
