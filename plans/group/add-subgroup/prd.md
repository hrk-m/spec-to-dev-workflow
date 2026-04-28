# PRD: add-subgroup

## 概要

| 項目         | 内容                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------ |
| 機能名       | `add-subgroup`                                                                                   |
| 目的         | 既存グループに別グループをサブグループ（子グループ）として追加し、グループのツリー構造を構築する |
| API          | `POST /api/v1/groups/:id/subgroups`                                                              |
| 認証         | 必要（AuthMiddleware）                                                                           |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                   |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `POST /api/v1/groups/:id/subgroups`

**リクエスト仕様**

| フィールド       | 型             | 必須 | 説明                      |
| ---------------- | -------------- | ---- | ------------------------- |
| `id` (path)      | integer        | ✓    | 親グループ ID（正の整数） |
| `child_group_id` | integer (body) | ✓    | 子グループ ID（正の整数） |

**バリデーション一覧**

| #   | 対象フィールド   | ルール                                                                  | エラー時の挙動   |
| --- | ---------------- | ----------------------------------------------------------------------- | ---------------- |
| 1   | `id` (path)      | 整数に変換できること                                                    | 400 Bad Request  |
| 2   | `id` (path)      | 1 以上の正の整数であること                                              | 400 Bad Request  |
| 3   | リクエストボディ | JSON デコードに成功すること                                             | 400 Bad Request  |
| 4   | `child_group_id` | 1 以上の正の整数であること                                              | 400 Bad Request  |
| 5   | 認証             | コンテキストから `authUser` を取得できること                            | 401 Unauthorized |
| 6   | 自己ループ       | `parent_group_id == child_group_id` は不可                              | 400 Bad Request  |
| 7   | parent 存在      | `parent_group_id` が DB 上に存在すること                                | 404 Not Found    |
| 8   | child 存在       | `child_group_id` が DB 上に存在すること                                 | 404 Not Found    |
| 9   | 循環参照防止     | 追加によってサイクルが生まれないこと                                    | 400 Bad Request  |
| 10  | グループ数上限   | parent が属する連結成分全体のグループ数が追加後も 10 以内であること     | 400 Bad Request  |
| 11  | 階層深度上限     | ルートから葉までのノード数が追加後も 5 以内であること                   | 400 Bad Request  |
| 12  | 重複チェック     | 同じ `(parent_group_id, child_group_id)` の関係が DB 上に存在しないこと | 409 Conflict     |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `POST /api/v1/groups/:id/subgroups`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

```
1. 開始
2. パスパラメータ :id (parent_group_id) を取得してパースする
   - パース失敗または 0 以下 → 400 Bad Request {"message": "given param is not valid"} → 終了
3. コンテキストから認証済みユーザー情報を取得する
   - 取得失敗 → 401 Unauthorized {"message": "Unauthorized"} → 終了
4. リクエストボディを JSON としてデコードする
   - デコード失敗 → 400 Bad Request {"message": "<Bind エラーメッセージ>"} → 終了
5. サービス層にサブグループ追加を委譲する
6. child_group_id が 1 未満の場合
   - → 400 Bad Request {"message": "given param is not valid"} → 終了
7. 自己ループチェック: parent_group_id == child_group_id の場合
   - → 400 Bad Request {"message": "given param is not valid"} → 終了
8. parent_group_id が DB 上に存在するか確認する（GroupRepository.GetByID）
   - 存在しない → 404 Not Found {"message": "your requested item is not found"} → 終了
   - DB エラー → 500 Internal Server Error {"message": "internal server error"} → 終了
9. child_group_id が DB 上に存在するか確認する（GroupRepository.GetByID）
   - 存在しない → 404 Not Found {"message": "your requested item is not found"} → 終了
   - DB エラー → 500 Internal Server Error {"message": "internal server error"} → 終了
10. 循環参照チェックを実行する
    - parent_group_id の祖先 ID 集合と child_group_id の子孫 ID 集合を取得する
    - 2 集合に重複がある場合 → 400 Bad Request {"message": "given param is not valid"} → 終了
    - DB エラー → 500 Internal Server Error → 終了
11. ツリー全体グループ数チェックを実行する
    - parent が属する連結成分全体のグループ数を取得する
    - 追加後に 10 グループ超となる場合 → 400 Bad Request {"message": "given param is not valid"} → 終了
    - DB エラー → 500 Internal Server Error → 終了
12. ルートから葉までのノード数（階層深度）を計算する
    - 追加後に 5 ノード超となる場合 → 400 Bad Request {"message": "given param is not valid"} → 終了
    - DB エラー → 500 Internal Server Error → 終了
13. group_relations に (parent_group_id, child_group_id) を INSERT する
    - UNIQUE 制約違反 → 409 Conflict {"message": "given param is not valid"} → 終了
    - DB エラー → 500 Internal Server Error → 終了
14. 201 Created {"parent_group_id": N, "child_group_id": M} を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### サブグループ追加（AddSubgroupSheet）

```
1. 開始
2. Subgroups セクションの「+ 追加」ボタン押下 → AddSubgroupSheet を開く
3. GET /api/v1/groups を送信する（q なし・全件取得）
   - 成功（200）→ total を "X groups" としてフォーム上部に表示する / groups 一覧を表示する（直接の子グループになっているものを除外）
   - 失敗（4xx・5xx）→ Sheet 内にエラーメッセージを表示する → 終了
4. ユーザーが検索フィールドにキーワードを入力する
5. 300ms デバウンス後、GET /api/v1/groups?q={keyword} を送信する
   - keyword が空文字の場合は q なしで送信する
   - 成功（200）→ groups 一覧と "X groups" の件数を更新する
   - 失敗（4xx・5xx）→ Sheet 内にエラーメッセージを表示する → 終了
6. ユーザーが追加するグループを 1 件選択する
7. 「追加する」ボタン押下（未選択時は disabled）
8. POST /api/v1/groups/:id/subgroups を送信する
9. レスポンスは成功？
   - Yes（201）→
     10. Sheet を閉じる
     11. サブグループ一覧を再取得する
     12. 終了
   - No（400: 循環参照・上限超過・自己ループ等）→
     10. Sheet 内にエラーメッセージを表示する
     11. 終了
   - No（409: 重複）→
     10. Sheet 内に「すでに追加済みです」を表示する
     11. 終了
   - No（4xx・5xx）→
     10. エラーメッセージを表示する
     11. 終了
```

---

## 確認ステップ 5-3: ファイル配置

### sample-api

| ファイル                                                             | 役割                                                                                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `sample-api/domain/group_relation.go`                                | `GroupRelation` Entity（parent_group_id, child_group_id）定義（独立ファイル）                                          |
| `sample-api/group/service.go`                                        | `GroupRelationRepository` IF 追加・`CreateSubGroup` メソッド                                                           |
| `sample-api/group/service_test.go`                                   | `CreateSubGroup` サービステスト                                                                                        |
| `sample-api/group/mocks/group_relation_repository_mock.go`           | `GroupRelationRepository` 手動 mock（新規作成）                                                                        |
| `sample-api/internal/rest/group.go`                                  | `CreateSubGroup` ハンドラ・`GroupService` IF に `CreateSubGroup` 追加・ルート登録（POST /api/v1/groups/:id/subgroups） |
| `sample-api/internal/rest/group_test.go`                             | `CreateSubGroup` ハンドラテスト                                                                                        |
| `sample-api/internal/rest/mocks/group_service_mock.go`               | `GroupService` mock に `CreateSubGroup` 追加                                                                           |
| `sample-api/internal/repository/mysql/group_relation.go`             | `GroupRelationRepository` MySQL 実装（新規ファイル・WITH RECURSIVE で祖先/子孫集合取得）                               |
| `sample-api/db/migrate/20260425000000_create_group_relations.up.sql` | `group_relations` テーブル作成                                                                                         |
| `sample-api/app/main.go`                                             | DI 配線（`GroupRelationRepository` の注入）                                                                            |

### sample-front

| ファイル                                                                     | 役割                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sample-front/src/pages/group-detail/api/add-subgroup.ts`                    | POST /api/v1/groups/:id/subgroups fetch 関数（新規）                                                                                                              |
| `sample-front/src/pages/group-detail/api/fetch-groups.ts`                    | GET /api/v1/groups fetch 関数。`fetchGroupsForSheet(q?: string)` に `q` パラメータを追加し、クエリ文字列として付与する                                            |
| `sample-front/src/pages/group-detail/ui/AddSubgroupSheet.tsx`                | グループ選択 Sheet。検索フォーム（TextField + 虫眼鏡アイコン）・`q` state・300ms デバウンス（`useEffect + setTimeout`）・"X groups" 件数表示（`total`）を追加する |
| `sample-front/src/pages/group-detail/ui/__tests__/AddSubgroupSheet.test.tsx` | 検索機能テストケースを追加する（既存テストファイルに追記）                                                                                                        |

> DB スキーマ（`group_relations` テーブル定義・制約・FK）の詳細は [plans/schema.md](../../schema.md) を参照。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `POST /api/v1/groups/:id/subgroups`

### レスポンス（正常系）

- ステータス: `201 Created`

```json
{
  "parent_group_id": 1,
  "child_group_id": 2
}
```

### エラーケース一覧

| 条件                                   | 発生レイヤー       | ステータス                | レスポンス                                        |
| -------------------------------------- | ------------------ | ------------------------- | ------------------------------------------------- |
| `id` (path) が整数に変換不可           | Handler            | 400 Bad Request           | `{"message": "given param is not valid"}`         |
| `id` が 0 以下                         | Handler            | 400 Bad Request           | `{"message": "given param is not valid"}`         |
| JSON デコード失敗                      | Handler            | 400 Bad Request           | `{"message": "<Bind エラーメッセージ>"}`          |
| `child_group_id` が 1 未満             | Service            | 400 Bad Request           | `{"message": "given param is not valid"}`         |
| `authUser` 取得失敗                    | Handler            | 401 Unauthorized          | `{"message": "Unauthorized"}`                     |
| 自己ループ（parent == child）          | Service            | 400 Bad Request           | `{"message": "given param is not valid"}`         |
| `parent_group_id` が DB に存在しない   | Service/Repository | 404 Not Found             | `{"message": "your requested item is not found"}` |
| `child_group_id` が DB に存在しない    | Service/Repository | 404 Not Found             | `{"message": "your requested item is not found"}` |
| 循環参照検出                           | Service            | 400 Bad Request           | `{"message": "given param is not valid"}`         |
| ツリー全体グループ数が 10 超（追加後） | Service            | 400 Bad Request           | `{"message": "given param is not valid"}`         |
| 階層深度（ノード数）が 5 超（追加後）  | Service            | 400 Bad Request           | `{"message": "given param is not valid"}`         |
| 重複（UNIQUE 制約違反）                | Repository         | 409 Conflict              | `{"message": "given param is not valid"}`         |
| DB エラー                              | Repository         | 500 Internal Server Error | `{"message": "internal server error"}`            |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `POST /api/v1/groups/:id/subgroups`

**FE コンポーネントテスト** (`pages/group-detail/ui/__tests__/AddSubgroupSheet.test.tsx`):

| #   | 観点     | テスト内容                                               | 期待結果                                                      |
| --- | -------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | 正常系   | グループ選択 → 追加ボタン押下 → 201 成功                 | onClose が呼ばれ一覧が refetch される                         |
| 2   | 分岐条件 | グループ未選択時は追加ボタンが disabled                  | ボタンがクリック不可                                          |
| 3   | 分岐条件 | グループ選択後は追加ボタンが enabled                     | ボタンがクリック可                                            |
| 4   | 異常系   | POST API が 400 を返す                                   | Sheet 内にエラーメッセージが表示される                        |
| 5   | 異常系   | POST API が 409 を返す                                   | 「すでに追加済みです」が表示される                            |
| 6   | 正常系   | Sheet 開封時に全件取得され "X groups" の件数が表示される | `fetchGroupsForSheet("")` が呼ばれ total 件数が表示される     |
| 7   | 正常系   | キーワード入力後 300ms で `q` 付き API が呼ばれる        | `fetchGroupsForSheet("dev")` が呼ばれ groups 一覧が更新される |
| 8   | 分岐条件 | 検索結果が 0 件のとき "0 groups" が表示される            | "0 groups" が表示される                                       |
| 9   | 分岐条件 | 検索フィールドをクリアすると q なしで全件取得される      | `fetchGroupsForSheet("")` が再度呼ばれる                      |
| 10  | 異常系   | グループ取得 API がエラーを返す                          | Sheet 内にエラーメッセージが表示される                        |
| 11  | 外部依存 | `fetchGroupsForSheet` はモックに差し替える               | 実際の HTTP 通信は発生しない                                  |

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                                      | 入力例                           | 期待結果                    |
| --- | -------- | ----------------------------------------------- | -------------------------------- | --------------------------- |
| 1   | 正常系   | 有効な parentGroupID + childGroupID で登録成功  | id=1, body={child_group_id:2}    | 201 Created + relation JSON |
| 2   | 異常系   | `authUser` を取得できない（型アサーション失敗） | —                                | 401 Unauthorized            |
| 3   | 異常系   | id が文字列                                     | id=abc                           | 400 Bad Request             |
| 4   | 境界値   | id=0（最小境界外）                              | id=0                             | 400 Bad Request             |
| 5   | 異常系   | 不正 JSON body                                  | body="{invalid}"                 | 400 Bad Request             |
| 6   | 異常系   | service が ErrBadParamInput を返す              | 自己ループ・循環参照・上限超過等 | 400 Bad Request             |
| 7   | 異常系   | service が ErrNotFound を返す                   | 存在しない group ID              | 404 Not Found               |
| 8   | 異常系   | service が ErrConflict を返す                   | 重複登録                         | 409 Conflict                |
| 9   | 例外処理 | service が ErrInternalServerError を返す        | DB エラー                        | 500 Internal Server Error   |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                                     | 入力例                           | 期待結果               |
| --- | -------- | ---------------------------------------------- | -------------------------------- | ---------------------- |
| 10  | 正常系   | 有効な parentGroupID + childGroupID → 登録成功 | parent=1, child=2                | GroupRelation を返す   |
| 11  | 異常系   | `child_group_id` が 0                          | child=0                          | ErrBadParamInput       |
| 12  | 異常系   | 自己ループ（parent == child）                  | parent=1, child=1                | ErrBadParamInput       |
| 13  | 異常系   | parent_group_id が DB に存在しない             | parent=9999                      | ErrNotFound            |
| 14  | 異常系   | child_group_id が DB に存在しない              | child=9999                       | ErrNotFound            |
| 15  | 分岐条件 | 循環参照が検出される（child が parent の祖先） | 既存ツリーで parent=A→B, child=A | ErrBadParamInput       |
| 16  | 境界値   | ツリーグループ数が 9（追加後 10）              | count=9                          | GroupRelation を返す   |
| 17  | 境界値   | ツリーグループ数が 10（追加後 11）             | count=10                         | ErrBadParamInput       |
| 18  | 境界値   | 階層深度が 4 ノード（追加後 5 ノード）         | depth=4                          | GroupRelation を返す   |
| 19  | 境界値   | 階層深度が 5 ノード（追加後 6 ノード）         | depth=5                          | ErrBadParamInput       |
| 20  | 異常系   | repository が ErrConflict を返す（重複登録）   | 同一 parent+child                | ErrConflict            |
| 21  | 例外処理 | repository が DB エラーを返す                  | mock がエラーを返す              | ErrInternalServerError |

---

## 要件

1. `POST /api/v1/groups/:id/subgroups` エンドポイントが実装されている
2. リクエストボディ: `{ "child_group_id": integer }`
3. `parent_group_id == child_group_id` の場合は 400 を返す
4. `parent_group_id` または `child_group_id` が DB に存在しない場合は 404 を返す
5. 追加によって循環参照が発生する場合は 400 を返す
6. parent が属する連結成分全体のグループ数が追加後に 10 を超える場合は 400 を返す
7. ルートから葉までのノード数（階層深度）が追加後に 5 を超える場合は 400 を返す
8. 同じ `(parent_group_id, child_group_id)` の関係がすでに存在する場合は 409 を返す
9. 成功時は 201 Created + `{"parent_group_id": N, "child_group_id": M}` を返す
10. `GroupRelationRepository` インターフェースを `group/service.go` 内に定義する（`GroupRepository` とは独立した別 IF）
11. MySQL 実装は `internal/repository/mysql/group_relation.go` に新規作成し、WITH RECURSIVE を使って祖先・子孫集合を取得する
12. 各バリデーションで使用するエラーセンチネル: `ErrBadParamInput`（400）・`ErrNotFound`（404）・`ErrConflict`（409）・`ErrInternalServerError`（500）
13. AddSubgroupSheet 上部に「Search by name or description」のテキストフィールドを表示する
14. 検索キーワードを `q` パラメータとして `GET /api/v1/groups` に渡す（既存 API を使用）
15. 空文字のとき `q` なしで全件取得する
16. 入力後 300ms デバウンス後に API を再送信する（`useEffect + setTimeout` で実装）
17. API レスポンスの `total` を "X groups" としてフォーム上部に表示する
18. バックエンドの変更はなし

---

## 対象外

- 公開設定整合性（グループの公開/非公開フラグは未実装）
- 権限チェック（認証済みユーザーなら全員操作可）
- 親子関係の更新操作
