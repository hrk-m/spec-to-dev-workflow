# PRD: get-group

## 概要

| 項目         | 内容                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 機能名       | `get-group`                                                                                                               |
| 目的         | グループ ID を指定してグループの基本情報とサブグループ一覧を取得する。グループ詳細画面（`/groups/:id`）の主要データソース |
| API          | `GET /api/v1/groups/:id`                                                                                                  |
| 認証         | 必要（AuthMiddleware）                                                                                                    |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                                            |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups/:id`

#### リクエスト仕様

| フィールド | 型             | 必須 | 説明                    |
| ---------- | -------------- | ---- | ----------------------- |
| `id`       | integer (path) | ✓    | グループの ID。正の整数 |

#### バリデーション一覧

| #   | 対象フィールド | ルール                            | エラー時の挙動  |
| --- | -------------- | --------------------------------- | --------------- |
| 1   | `id`           | 整数に変換できること              | 400 Bad Request |
| 2   | `id`           | 1 以上（正の整数）であること      | 400 Bad Request |
| 3   | `id`           | DB 上に該当グループが存在すること | 404 Not Found   |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `GET /api/v1/groups/:id`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

#### バックエンド処理フロー

```
1. 開始
2. パスパラメータ id を取得してパースする
   - パース失敗または 0 以下の場合 → 400 Bad Request { "message": "given param is not valid" } → 終了
3. サービス層に取得を委譲する
4. サービス層で id が 1 未満かどうかを確認する
   - 1 未満の場合 → 400 Bad Request → 終了
5. 削除済みでないグループを id で検索する
   - 存在しない場合 → 404 Not Found { "message": "your requested item is not found" } → 終了
   - DB エラーの場合 → 500 Internal Server Error { "message": "internal server error" } → 終了
6. グループ基本情報（id, name, description, member_count）を取得する
7. GroupRelationRepository.ListChildren でサブグループ一覧を取得する
   - DB エラーの場合 → 500 Internal Server Error { "message": "internal server error" } → 終了
   - サブグループなし → 空スライス（nil でなく []）を使用する
8. handler 層の専用レスポンス型（getGroupResponse）に詰めて 200 OK を返す → 終了
   ※ domain.Group には Subgroups フィールドを追加しない（list 系レスポンスへの波及防止）
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### エンドポイント: `GET /api/v1/groups/:id`

凡例: `→` = 次の処理へ進む / 終了 = 処理終了

```
1. 開始
2. グループ詳細画面マウント時に GET /api/v1/groups/:id を 1 回送信する
3. レスポンス受信
   - 成功（200）→ { id, name, description, member_count, subgroups: [...] } を state に格納する → 終了
   - 失敗（4xx/5xx）→ エラーメッセージを画面に表示する → 終了
4. useGroupDetail が subgroups を返す
5. GroupDetailContent は useGroupDetail から subgroups を取得して SubgroupFilterChips / SubgroupManagementSheet に渡す
6. AddSubgroupSheet に subgroups を props で渡す
   ※ シート開閉ハンドラのメモ化依存に subgroups を含める
7. サブグループ追加・削除後は refetch（useGroupDetail の refetch）を呼ぶ
   → GET /api/v1/groups/:id を再取得し subgroups も更新される
```

> メンバー一覧は GET /api/v1/groups/:id/members で別途取得する。

---

## 確認ステップ 5-3: ファイル配置

**原則: 関与した全ファイルを列挙し、役割は具体的に書く。**

### sample-api

| ファイル                                               | 役割                                                                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `sample-api/internal/rest/group.go`                    | `GetByID` ハンドラ・専用 `getGroupResponse` 型・ルート登録                                                                                     |
| `sample-api/internal/rest/mocks/group_service_mock.go` | `GroupService` interface の手動 mock                                                                                                           |
| `sample-api/internal/rest/group_test.go`               | `GetByID` Handler ユニットテスト（`subgroups` フィールドの検証を含む）                                                                         |
| `sample-api/group/service.go`                          | `GetByID` ロジック（`GroupRepository.GetByID` + `GroupRelationRepository.ListChildren` + `relationRepo nil` ガード）・`GroupService` interface |
| `sample-api/group/service_test.go`                     | `GetByID` Service ユニットテスト（`ListChildren` mock を含む）                                                                                 |

### sample-front

| ファイル                                                                            | 役割                                                                                            |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `sample-front/src/pages/group-detail/api/fetch-group.ts`                            | `GET /api/v1/groups/:id` 呼び出し（レスポンス型に `subgroups: SubgroupSummary[]` を含む）       |
| `sample-front/src/pages/group-detail/model/group-detail.ts`                         | `GroupDetail` 型・`SubgroupSummary` 型の定義                                                    |
| `sample-front/src/pages/group-detail/model/useGroupDetail.ts`                       | `useGroupDetail` カスタムフック（`group` / `subgroups` / `refetch` を返す）                     |
| `sample-front/src/pages/group-detail/ui/GroupDetailContent.tsx`                     | `useGroupDetail` から `subgroups` を取得し SubgroupFilterChips / SubgroupManagementSheet に渡す |
| `sample-front/src/pages/group-detail/ui/AddSubgroupSheet.tsx`                       | `subgroups: SubgroupSummary[]` を props で受け取るシート                                        |
| `sample-front/src/pages/group-detail/ui/SubgroupManagementSheet.tsx`                | サブグループ管理シート（`SubgroupSummary` を `model/group-detail.ts` から import）              |
| `sample-front/src/pages/group-detail/ui/__tests__/AddSubgroupSheet.test.tsx`        | AddSubgroupSheet のテスト（`subgroups` props のモック化）                                       |
| `sample-front/src/pages/group-detail/ui/__tests__/GroupDetailContent.test.tsx`      | GroupDetailContent のテスト（`useGroupDetail` 返り値に `subgroups` を含めるモック）             |
| `sample-front/src/pages/group-detail/ui/__tests__/SubgroupManagementSheet.test.tsx` | SubgroupManagementSheet のテスト                                                                |

> DB スキーマ（`group_relations` テーブル定義・制約・FK）の詳細は [plans/schema.md](../../schema.md) を参照。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/groups/:id`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "id": 1,
  "name": "dev-team",
  "description": "開発チーム",
  "member_count": 5,
  "subgroups": [
    {
      "id": 2,
      "name": "Frontend Team",
      "description": "FE チーム",
      "member_count": 3
    },
    {
      "id": 3,
      "name": "Backend Team",
      "description": "BE チーム",
      "member_count": 4
    }
  ]
}
```

サブグループなしの場合は `"subgroups": []`

### エラーケース一覧

| 条件                          | 発生レイヤー                       | ステータス                | レスポンス                                          |
| ----------------------------- | ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可         | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| 該当グループが存在しない      | Service / Repository               | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー（グループ取得）     | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| DB エラー（サブグループ取得） | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| ネットワークエラー            | フロントエンド: API クライアント層 | —                         | エラーメッセージ表示                                |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/groups/:id`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                   | 入力例                 | 期待結果                            |
| --- | -------- | ---------------------------- | ---------------------- | ----------------------------------- |
| 1   | 正常系   | subgroups なし（空配列）     | `id=1`（関係なし）     | 200 OK + `subgroups: []`            |
| 2   | 正常系   | subgroups ありのグループ取得 | `id=1`                 | 200 OK + `subgroups` フィールドあり |
| 3   | 異常系   | 文字列を id に指定           | `id=abc`               | 400 Bad Request                     |
| 4   | 境界値   | id=0（最小境界外）           | `id=0`                 | 400 Bad Request                     |
| 5   | 境界値   | id=-1（負の整数）            | `id=-1`                | 400 Bad Request                     |
| 6   | 異常系   | 存在しないグループ ID        | `id=9999`              | 404 Not Found                       |
| 7   | 例外処理 | DB 接続エラー発生時          | DB mock がエラーを返す | 500 Internal Server Error           |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                        | 入力例                   | 期待結果                 |
| --- | -------- | --------------------------------- | ------------------------ | ------------------------ |
| 7   | 正常系   | グループ + subgroups を返す       | `id=1`                   | Group + `[]domain.Group` |
| 8   | 正常系   | subgroups なし（空スライス）      | `id=1`（関係なし）       | Group + `[]`             |
| 9   | 例外処理 | `ListChildren` が DB エラーを返す | mock がエラーを返す      | ErrInternalServerError   |
| 10  | 異常系   | 存在しないグループ ID             | `id=9999`                | ErrNotFound              |
| 11  | 境界値   | id=0（最小境界外）                | `id=0`                   | ErrBadParamInput         |
| 12  | 例外処理 | GroupRepository がエラーを返す    | repo mock がエラーを返す | ErrInternalServerError   |

**FE コンポーネントテスト**:

| #   | ファイル                           | 観点   | テスト内容                                                              | 期待結果                                              |
| --- | ---------------------------------- | ------ | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| 13  | `GroupDetailContent.test.tsx`      | 正常系 | `useGroupDetail` が subgroups を返し SubgroupManagementSheet に渡される | SubgroupManagementSheet が正しい subgroups を受け取る |
| 14  | `AddSubgroupSheet.test.tsx`        | 正常系 | `subgroups` props を受け取り既存子グループを除外して表示する            | 内部フェッチが発生しない                              |
| 15  | `SubgroupManagementSheet.test.tsx` | 正常系 | import 先変更後も既存テストが通る                                       | テスト結果に変化なし                                  |

---

## 最低要件

1. `GET /api/v1/groups/:id` がグループ基本情報（id, name, description, member_count）と `subgroups: []` を返す
2. `id` が整数でない / 0 以下の場合に 400 を返す
3. 対象グループが存在しない場合に 404 を返す
4. サブグループ取得時の DB エラーで 500 を返す
5. `domain.Group` に `Subgroups` フィールドは持たず、handler 層の `getGroupResponse` で吸収する
6. `AddSubgroupSheet` は `subgroups` を props で受け取る（内部フェッチなし）
7. サブグループ追加・削除後の refetch は `useGroupDetail` の `refetch` に統一する

---

## 対象外

- 認証・認可（AuthMiddleware はグループ全体に適用済み。個別ハンドラ内での追加チェックは不要）
- グループの更新・削除
- メンバー一覧取得（`list-group-members` で別途管理）
