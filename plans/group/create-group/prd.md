# PRD: グループ作成機能

## 目的・ゴール

グループ一覧ページ右上に `[+ Create Group]` ボタンを配置し、モーダルで name / description を入力してグループを作成できる。作成成功後は作成したグループの詳細ページ `/groups/:id` に遷移する。グループ作成時に作成者（ログインユーザー）を `groups.updated_by` に記録し、同トランザクションで作成者を初期メンバーとして `group_members` に追加する。

---

## 最低要件

1. `POST /api/v1/groups` エンドポイントを新規追加する
2. リクエストボディ: `{ "name": string, "description": string }`
3. `name` は前後空白をトリムし、トリム後 1〜100 文字でなければ 400 を返す
4. `description` は任意（空文字可）
5. バリデーション通過後、`groups` テーブルに `updated_by`（操作者の user_id）を含めて INSERT する
6. INSERT 成功後、同一トランザクション内で `group_members` に作成者を INSERT する
7. トランザクション失敗時はロールバックし 500 を返す
8. 成功時は 201 + 作成済み Group（`member_count: 1`）を返す
9. DB エラー時は 500 を返す
10. グループ一覧ページ右上に `[+ Create Group]` ボタンを配置する
11. ボタン押下で Radix UI Dialog を使ったモーダルが開く
12. モーダルに name（必須）と description（任意）の入力フォームを配置する
13. Create ボタン押下時に FE バリデーション（name 空・100 文字超 → インライン表示）を行う
14. バリデーション通過後に `POST /api/v1/groups` を呼び出す
15. 成功時は作成したグループの詳細ページ `/groups/:id` に遷移する
16. API エラー時はモーダル内にエラーメッセージを表示する

---

## API 仕様

### POST /api/v1/groups

**リクエスト**

```json
{
  "name": "string",
  "description": "string"
}
```

| フィールド    | 型     | 制約                               |
| ------------- | ------ | ---------------------------------- |
| `name`        | string | 必須、前後空白トリム後 1〜100 文字 |
| `description` | string | 任意（空文字可）                   |

> `updated_by` はリクエストボディに含まない。サーバー内部で `authUser` から取得する。

**レスポンス**

| ケース                              | レイヤー   | HTTP | ボディ                                                       |
| ----------------------------------- | ---------- | ---- | ------------------------------------------------------------ |
| 成功                                | handler    | 201  | `{"id":1,"name":"...","description":"...","member_count":1}` |
| JSON パース失敗（Bind エラー）      | handler    | 400  | `{"message":"<Bind エラーメッセージ>"}`                      |
| name 空 / トリム後空 / 100 文字超過 | service    | 400  | `{"message":"given param is not valid"}`                     |
| authUser 取得失敗                   | handler    | 401  | `{"message":"Unauthorized"}`                                 |
| DB エラー（groups または group_members INSERT 失敗） | repository | 500 | `{"message":"internal server error"}` |

---

## BE 処理フロー

```
1. リクエストボディを c.Bind(&req) でパース（失敗時 400 + Bind エラーメッセージ）
2. c.Get("authUser").(domain.User) で authUser を取得
   - 型アサーション失敗 → 401 Unauthorized
3. service.Store(ctx, req.Name, req.Description, authUser.ID) を呼び出す
4. service 層で strings.TrimSpace(name) を適用
5. トリム後 name が空 or 100 文字超 → domain.ErrBadParamInput（400）
6. repository.Store(ctx, name, description, userID) を呼び出す
7. トランザクションを開始（db.BeginTx）
8. INSERT INTO groups (name, description, updated_by) VALUES (?, ?, ?)
9. LastInsertId で groupID を取得（エラーまたは id < 0 の場合はロールバック → 500）
10. INSERT INTO group_members (group_id, user_id) VALUES (groupID, userID)
    - エラーの場合はロールバック → 500
11. トランザクションをコミット（失敗時もロールバック → 500）
12. domain.Group{ID, Name, Description, MemberCount: 1} を返す
13. 201 Created + Group JSON を返す
```

---

## FE 処理フロー

```
1. GroupList.tsx のヘッダー右側に [+ Create Group] ボタンを配置
2. ボタンは Radix UI Dialog.Trigger として機能する
3. Dialog.Content 内に name（TextField）と description（TextArea）を配置
4. Create ボタン押下で FE バリデーションを実行
   - name が空（トリム後空含む）→ インライン表示（"Name is required"）
   - name が 101 文字以上 → インライン表示（"Name must be 100 characters or less"）
5. バリデーション通過 → POST /api/v1/groups を呼び出す
6. 送信中は Create ボタンを disabled にする（isLoading）
7. 成功時 → useNavigate で /groups/:id に遷移する
8. API エラー時 → Dialog 内にエラーメッセージを表示する（モーダルは開いたまま）
```

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md](../../schema.md) を参照。

### マイグレーション

```sql
-- db/migrate/20260417130000_add_updated_by_to_groups.up.sql
ALTER TABLE `groups`
  ADD COLUMN updated_by BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_groups_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
```

> 既存行がある開発環境では `make db-reset` でリセットしてからマイグレーションを適用する。

### トランザクション内 SQL

```sql
-- 1. グループ INSERT
INSERT INTO `groups` (name, description, updated_by) VALUES (?, ?, ?)

-- 2. 作成者をメンバーに INSERT
INSERT INTO group_members (group_id, user_id) VALUES (?, ?)
```

| 条件               | 返却値                          |
| ------------------ | ------------------------------- |
| 両 INSERT 成功     | `domain.Group{MemberCount: 1}`  |
| いずれかの INSERT 失敗 | ロールバック → `domain.ErrInternalServerError` |

---

## BE 実装方針

### ファイル変更一覧

| ファイル                                    | 変更内容                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `db/migrate/20260417130000_add_updated_by_to_groups.up.sql` | 新規: `groups` に `updated_by` カラム + FK 追加                                            |
| `db/seed/seed.sql`                          | 既存の `INSERT INTO groups` 文に `updated_by` カラムを追加（NOT NULL のため必須）                                        |
| `group/service.go`                          | `GroupRepository` IF の `Store` に `userID uint64` 追加、`Service.Store` の引数・呼び出しを更新                         |
| `internal/repository/mysql/group.go`        | `Store` をトランザクション化（groups INSERT + group_members INSERT）、`MemberCount: 1` で返す                             |
| `internal/rest/group.go`                    | `GroupService` IF の `Store` に `userID uint64` 追加、handler で `authUser` 取得・渡し、`getStatusCode` に `ErrBadParamInput → 400` マッピング追加 |
| `group/mocks/group_repository_mock.go`      | `Store` mock の引数に `userID uint64` を追加                                                                             |
| `internal/rest/mocks/group_service_mock.go` | `Store` mock の引数に `userID uint64` を追加                                                                             |
| `group/service_test.go`                     | `Store` のテスト更新（`userID` 引数追加）                                                                                |
| `internal/rest/group_test.go`               | `Store` ハンドラのテスト更新（`authUser` セット、401 ケース追加）                                                        |
| `internal/repository/mysql/group_test.go`   | `Store` integration テスト更新（両テーブル INSERT 確認、ロールバック確認）                                               |

### バリデーション配置

name のトリム + 文字数チェックは **service 層** で行う（既存パターンとの一貫性）。

### テストケース（BE）

**handler テスト** (`internal/rest/group_test.go`):

- 正常系: authUser あり + name="Test", description="Desc" → service.Store 成功 → 201 + Group JSON（member_count: 1）
- 異常系: authUser が取得できない（型アサーション失敗）→ 401
- 異常系: service.Store が ErrBadParamInput を返す → 400
- 異常系: service.Store が ErrInternalServerError を返す → 500

**service テスト** (`group/service_test.go`):

- 正常系: 有効な name/description/userID → repository.Store 成功 → Group を返す
- 正常系: name 前後にスペース → トリム後の name で repository.Store が呼ばれる
- 正常系: userID が repository.Store に正しく渡される
- 異常系: name="" → ErrBadParamInput を返す
- 異常系: name がスペースのみ（トリム後空）→ ErrBadParamInput を返す
- 異常系: name が 101 文字 → ErrBadParamInput を返す
- 異常系: repository.Store がエラー → ErrInternalServerError を返す

**repository テスト** (`internal/repository/mysql/group_test.go`):

- 正常系: groups + group_members 両方 INSERT 成功 → Group（member_count: 1）を返す（integration test）
- 異常系: group_members INSERT 失敗 → ロールバックされ ErrInternalServerError を返す
- 異常系: groups INSERT 失敗 → ErrInternalServerError を返す

---

## FE 実装方針

### ファイル変更一覧

| ファイル                                                 | 変更内容                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/pages/home/api/create-group.ts`                     | 新規: POST /api/v1/groups 呼び出し関数                                   |
| `src/pages/home/model/group.ts`                          | `CreateGroupRequest` / `CreateGroupResponse` 型追加                      |
| `src/pages/home/model/useCreateGroup.ts`                 | 新規: フォーム状態・バリデーション・API 呼び出しフック                   |
| `src/pages/home/ui/CreateGroupDialog.tsx`                | 新規: Radix Dialog モーダルコンポーネント                                |
| `src/pages/home/ui/CreateGroupDialog.styles.ts`          | 新規: モーダルスタイル                                                   |
| `src/pages/home/ui/GroupList.tsx`                        | ヘッダー部に [+ Create Group] ボタン追加                                 |
| `src/pages/home/ui/__tests__/CreateGroupDialog.test.tsx` | 新規: モーダルテスト                                                     |
| `src/pages/home/model/__tests__/useCreateGroup.test.ts`  | 新規: フックテスト（model セグメントのコードは model/**tests**/ に配置） |

### テストケース（FE）

**CreateGroupDialog テスト**:

- モーダルが表示される
- name 空文字で Create 押下するとエラー表示
- name 101 文字で Create 押下するとエラー表示
- 正常入力で Create 押下すると POST API が呼ばれる
- API エラー時にモーダル内にエラーメッセージ表示

**useCreateGroup テスト**:

- デフォルト状態の確認（isLoading=false, error=null）
- submit 後に isLoading=true になること
- API 成功時に navigate が呼ばれること
