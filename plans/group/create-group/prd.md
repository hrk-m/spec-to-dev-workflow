# PRD: グループ作成機能

## 目的・ゴール

グループ一覧ページ右上に `[+ Create Group]` ボタンを配置し、モーダルで name / description を入力してグループを作成できる。作成成功後は作成したグループの詳細ページ `/groups/:id` に遷移する。

---

## 最低要件

1. `POST /api/v1/groups` エンドポイントを新規追加する
2. リクエストボディ: `{ "name": string, "description": string }`
3. `name` は前後空白をトリムし、トリム後 1〜100 文字でなければ 400 を返す
4. `description` は任意（空文字可）
5. バリデーション通過後、`groups` テーブルに INSERT し 201 + 作成済み Group を返す
6. DB エラー時は 500 を返す
7. グループ一覧ページ右上に `[+ Create Group]` ボタンを配置する
8. ボタン押下で Radix UI Dialog を使ったモーダルが開く
9. モーダルに name（必須）と description（任意）の入力フォームを配置する
10. Create ボタン押下時に FE バリデーション（name 空・100 文字超 → インライン表示）を行う
11. バリデーション通過後に `POST /api/v1/groups` を呼び出す
12. 成功時は作成したグループの詳細ページ `/groups/:id` に遷移する
13. API エラー時はモーダル内にエラーメッセージを表示する

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

**レスポンス**

| ケース                              | レイヤー   | HTTP | ボディ                                                       |
| ----------------------------------- | ---------- | ---- | ------------------------------------------------------------ |
| 成功                                | handler    | 201  | `{"id":1,"name":"...","description":"...","member_count":0}` |
| JSON パース失敗（Bind エラー）      | handler    | 400  | `{"message":"<Bind エラーメッセージ>"}`                      |
| name 空 / トリム後空 / 100 文字超過 | service    | 400  | `{"message":"given param is not valid"}`                     |
| DB エラー                           | repository | 500  | `{"message":"internal server error"}`                        |

---

## BE 処理フロー

```
1. リクエストボディを c.Bind(&req) でパース（失敗時 400 + Bind エラーメッセージ）
2. service.Store(ctx, req.Name, req.Description) を呼び出す
3. service 層で strings.TrimSpace(name) を適用
4. トリム後 name が空 or 100 文字超 → domain.ErrBadParamInput（400）
5. repository.Store(ctx, name, description) を呼び出す
6. INSERT INTO groups (name, description) VALUES (?, ?)
7. LastInsertId で ID を取得（エラーまたは id < 0 の場合は 500）
8. domain.Group{ID, Name, Description, MemberCount: 0} を返す
9. 201 Created + Group JSON を返す
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

## DB 操作

スキーマ変更なし。INSERT のみ追加。

```sql
INSERT INTO `groups` (name, description) VALUES (?, ?)
```

| カラム        | 値                   |
| ------------- | -------------------- |
| `name`        | トリム済み入力値     |
| `description` | 入力値（空文字容認） |
| `id`          | AUTO_INCREMENT       |
| `deleted_at`  | NULL（デフォルト）   |

---

## BE 実装方針

### ファイル変更一覧

| ファイル                                    | 変更内容                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `group/service.go`                          | `GroupRepository` IF に `Store` 追加、`Service.Store` 実装                                           |
| `internal/repository/mysql/group.go`        | `Store` メソッド追加（INSERT + LastInsertId）                                                        |
| `internal/rest/group.go`                    | `GroupService` IF に `Store` 追加、`storeGroupRequest` 型定義、POST ルート登録、`Store` ハンドラ実装 |
| `group/mocks/group_repository_mock.go`      | `Store` mock メソッド追加                                                                            |
| `internal/rest/mocks/group_service_mock.go` | `Store` mock メソッド追加                                                                            |
| `group/service_test.go`                     | `Store` のテスト追加                                                                                 |
| `internal/rest/group_test.go`               | `Store` ハンドラのテスト追加                                                                         |
| `internal/repository/mysql/group_test.go`   | `Store` integration テスト追加                                                                       |

### バリデーション配置

name のトリム + 文字数チェックは **service 層** で行う（既存パターンとの一貫性）。

### テストケース（BE）

バリデーションは service 層で行うため、テストケースは以下の通り配置する。

**handler テスト** (`internal/rest/group_test.go`):

- 正常系: name="Test", description="Desc" → service.Store 成功 → 201 + Group JSON
- 異常系: service.Store が ErrBadParamInput を返す → 400
- 異常系: service.Store が ErrInternalServerError を返す → 500

**service テスト** (`group/service_test.go`):

- 正常系: 有効な name/description → repository.Store 成功 → Group を返す
- 正常系: name 前後にスペース → トリム後の name で repository.Store が呼ばれる
- 異常系: name="" → ErrBadParamInput を返す
- 異常系: name がスペースのみ（トリム後空）→ ErrBadParamInput を返す
- 異常系: name が 101 文字 → ErrBadParamInput を返す
- 異常系: repository.Store がエラー → ErrInternalServerError を返す

**repository テスト** (`internal/repository/mysql/group_test.go`):

- 正常系: INSERT 成功 → Group を返す（integration test パターン）
- 異常系: INSERT 失敗 → ErrInternalServerError

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
