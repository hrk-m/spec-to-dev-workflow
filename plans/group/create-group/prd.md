# PRD: create-group

## 概要

| 項目         | 内容                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 機能名       | `create-group`                                                                                                                                                                                   |
| 目的         | グループ一覧ページ右上の `[+ Create Group]` ボタンからダイアログを開き、name / description を入力して新しいグループを作成する。作成成功後は作成したグループの詳細ページ `/groups/:id` に遷移する |
| API          | `POST /api/v1/groups`                                                                                                                                                                            |
| 認証         | 必要（AuthMiddleware）                                                                                                                                                                           |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                                                                                                                   |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `POST /api/v1/groups`

#### リクエスト仕様

**リクエストボディ**

| フィールド    | 型     | 必須 | 説明                                     |
| ------------- | ------ | ---- | ---------------------------------------- |
| `name`        | string | ✓    | グループ名。前後空白トリム後 1〜100 文字 |
| `description` | string | —    | 任意（空文字可）                         |

> `updated_by` はリクエストボディに含まない。サーバー内部で `authUser` から取得する。

#### バリデーション一覧

| #   | 対象フィールド   | ルール                                       | エラー時の挙動   |
| --- | ---------------- | -------------------------------------------- | ---------------- |
| 1   | リクエストボディ | JSON デコードに成功すること                  | 400 Bad Request  |
| 2   | `name`           | 前後空白トリム後に 1 文字以上であること      | 400 Bad Request  |
| 3   | `name`           | トリム後 100 文字以内であること              | 400 Bad Request  |
| 4   | 認証             | コンテキストから `authUser` を取得できること | 401 Unauthorized |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `POST /api/v1/groups`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

#### バックエンド処理フロー

```
1. 開始
2. リクエストボディを JSON としてデコードする
   - デコード失敗 → 400 Bad Request { "message": "<Bind エラーメッセージ>" } → 終了
3. コンテキストから認証済みユーザー情報を取得する
   - 取得失敗 → 401 Unauthorized { "message": "Unauthorized" } → 終了
4. グループ作成をサービス層に委譲する
5. サービス層で name の前後空白をトリムする
6. トリム後の name が空または 100 文字超の場合
   - → 400 Bad Request { "message": "given param is not valid" } → 終了
7. トランザクションを開始してグループを登録する
   - 開始失敗 → 500 Internal Server Error → 終了
8. グループを登録する（name, description, updated_by）
   - 登録失敗 → ロールバック → 500 Internal Server Error → 終了
9. 発行されたグループ ID を取得する
   - 取得失敗 → ロールバック → 500 Internal Server Error → 終了
10. 作成者をグループメンバーとして登録する
    - 登録失敗 → ロールバック → 500 Internal Server Error → 終了
11. トランザクションをコミットする
    - コミット失敗 → ロールバック → 500 Internal Server Error → 終了
12. 201 Created + 作成グループ（member_count: 1）を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

凡例: → は処理遷移

```
1. 開始
2. GroupList コンポーネントのヘッダー右側に [+ Create Group] ボタンを配置する
3. ボタンクリックで CreateGroupDialog ダイアログを開く
4. ダイアログ内で name（TextField）と description（TextArea）を入力する
5. Create ボタンをクリックする
6. useCreateGroup フックが FE バリデーションを実行する
   - name が空（トリム後空含む）→ インラインエラー表示（"Name is required"）→ 終了
   - name が 101 文字以上 → インラインエラー表示（"Name must be 100 characters or less"）→ 終了
7. バリデーション通過 → POST /api/v1/groups を送信する
   - 送信中は Create ボタンを disabled にする（isLoading）
8. レスポンス受信
   - 成功（201 Created）→ 作成グループをグループ一覧キャッシュの先頭に追加する → navigate で /groups/:id に遷移する → 終了
   - 失敗 → ダイアログ内にエラーメッセージを表示する（ダイアログは開いたまま）→ 終了
```

---

## 確認ステップ 5-3: ファイル配置

→ [plans/schema.md](../../schema.md) を参照。

### sample-api

| ファイル                                                    | 役割                                                                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `sample-api/domain/group.go`                                | Group Entity（id, name, description, member_count）                                                               |
| `sample-api/group/service.go`                               | `GroupRepository` IF の `Store` に `userID uint64` 追加・`Service.Store` のビジネスロジック（トリム・文字数検証） |
| `sample-api/group/service_test.go`                          | Service ユニットテスト（Store）                                                                                   |
| `sample-api/group/mocks/group_repository_mock.go`           | GroupRepository の手動 mock（Store シグネチャ）                                                                   |
| `sample-api/internal/rest/group.go`                         | HTTP Handler（Store）・GroupService interface・ルート登録（POST /api/v1/groups）・authUser 取得                   |
| `sample-api/internal/rest/group_test.go`                    | Handler ユニットテスト（Store）                                                                                   |
| `sample-api/internal/rest/mocks/group_service_mock.go`      | GroupService の手動 mock（Store シグネチャ）                                                                      |
| `sample-api/internal/repository/mysql/group.go`             | MySQL 実装（Store: トランザクション・groups INSERT + group_members INSERT・MemberCount: 1 で返す）                |
| `sample-api/db/migrate/20260403120000_create_tables.up.sql` | `groups` / `group_members` テーブル定義・マイグレーション（golang-migrate）                                       |

### sample-front

| ファイル                                                     | 役割                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `sample-front/src/pages/home/api/create-group.ts`            | POST /api/v1/groups 呼び出し関数                                      |
| `sample-front/src/pages/home/model/group.ts`                 | `CreateGroupRequest` / `CreateGroupResponse` 型定義                   |
| `sample-front/src/pages/home/model/useCreateGroup.ts`        | フォーム状態・バリデーション・API 呼び出し・キャッシュ先頭追加フック  |
| `sample-front/src/pages/home/model/group-list.ts`            | `prependGroupToGroupListCache` でグループ一覧キャッシュ先頭に追加     |
| `sample-front/src/pages/home/ui/CreateGroupDialog.tsx`       | Radix Dialog モーダルコンポーネント（name / description フォーム）    |
| `sample-front/src/pages/home/ui/CreateGroupDialog.styles.ts` | モーダルスタイル                                                      |
| `sample-front/src/pages/home/ui/GroupList.tsx`               | ヘッダー部に [+ Create Group] ボタン（CreateGroupDialog.Trigger）追加 |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `POST /api/v1/groups`

### レスポンス（正常系）

- ステータス: `201 Created`

```json
{
  "id": 1,
  "name": "dev-team",
  "description": "開発チーム",
  "member_count": 1
}
```

### エラーケース一覧

| 条件                                                 | 発生レイヤー                       | ステータス                | レスポンス                                  |
| ---------------------------------------------------- | ---------------------------------- | ------------------------- | ------------------------------------------- |
| JSON パース失敗（Bind エラー）                       | Handler                            | 400 Bad Request           | `{ "message": "<Bind エラーメッセージ>" }`  |
| `name` 空 / トリム後空 / 100 文字超過                | Service                            | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| `authUser` 取得失敗                                  | Handler                            | 401 Unauthorized          | `{ "message": "Unauthorized" }`             |
| DB エラー（groups または group_members INSERT 失敗） | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`    |
| ネットワークエラー                                   | フロントエンド: API クライアント層 | —                         | ダイアログ内にエラーメッセージ表示          |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `POST /api/v1/groups`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                                                           | 期待結果                                    |
| --- | -------- | -------------------------------------------------------------------- | ------------------------------------------- |
| 1   | 正常系   | authUser あり + name="Test", description="Desc" → service.Store 成功 | 201 Created + Group JSON（member_count: 1） |
| 2   | 異常系   | authUser が取得できない（型アサーション失敗）                        | 401 Unauthorized                            |
| 3   | 異常系   | リクエストボディが不正 JSON                                          | 400 Bad Request                             |
| 4   | 異常系   | service.Store が ErrBadParamInput を返す（name 空）                  | 400 Bad Request                             |
| 5   | 例外処理 | service.Store が ErrInternalServerError を返す                       | 500 Internal Server Error                   |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                                                           | 期待結果               |
| --- | -------- | -------------------------------------------------------------------- | ---------------------- |
| 6   | 正常系   | 有効な name/description/userID → repository.Store 成功               | Group を返す           |
| 7   | 正常系   | name 前後にスペース → トリム後の name で repository.Store が呼ばれる | Group を返す           |
| 8   | 正常系   | userID が repository.Store に正しく渡される                          | Group を返す           |
| 9   | 異常系   | name が空文字                                                        | ErrBadParamInput       |
| 10  | 異常系   | name がスペースのみ（トリム後空）                                    | ErrBadParamInput       |
| 11  | 境界値   | name が 101 文字                                                     | ErrBadParamInput       |
| 12  | 例外処理 | repository.Store がエラー                                            | ErrInternalServerError |

---

## 要件

1. `POST /api/v1/groups` エンドポイントが実装されている
2. リクエストボディ: `{ "name": string, "description": string }`
3. `name` は前後空白トリム後、1〜100 文字でなければ 400 を返す
4. `description` は任意（空文字可）
5. `updated_by` はサーバー内部で `authUser` から取得する
6. groups INSERT 成功後、同一トランザクションで group_members に作成者を INSERT する
7. トランザクション失敗時はロールバックし 500 を返す
8. 成功時は 201 + 作成済み Group（`member_count: 1`）を返す
9. グループ一覧ページ右上に `[+ Create Group]` ボタンを配置する
10. ボタン押下で CreateGroupDialog モーダルが開く
11. Create ボタン押下時に FE バリデーション（name 空・100 文字超 → インライン表示）を行う
12. 成功時は作成したグループの詳細ページ `/groups/:id` に遷移する
13. API エラー時はモーダル内にエラーメッセージを表示する

---

## 対象外

- グループの更新・削除
- メンバーの追加・削除（作成者の初期追加はトランザクション内で実施済み）
