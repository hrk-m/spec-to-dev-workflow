# PRD: list-subgroups

## 概要

| 項目         | 内容                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 機能名       | `list-subgroups`                                                                                                       |
| 目的         | 親グループ ID を指定してサブグループ一覧のみを取得する。サブグループ管理シートを subgroup のみに依存させ関心を分離する |
| API          | `GET /api/v1/groups/:id/subgroups`                                                                                     |
| 認証         | 必要（AuthMiddleware）                                                                                                 |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                                         |

> 既存 `GET /api/v1/groups/:id` のレスポンスは変更しない（`subgroups` フィールドは互換性維持のため残す）。

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups/:id/subgroups`

#### リクエスト仕様

| フィールド | 型             | 必須 | 説明                      |
| ---------- | -------------- | ---- | ------------------------- |
| `id`       | integer (path) | ✓    | 親グループの ID。正の整数 |

クエリパラメータ・リクエストボディは無し（軽量 API としてページネーションなし）。

#### バリデーション一覧

| #   | 対象フィールド | ルール                                                     | エラー時の挙動   |
| --- | -------------- | ---------------------------------------------------------- | ---------------- |
| 1   | `id`           | 整数に変換できること                                       | 400 Bad Request  |
| 2   | `id`           | 1 以上（正の整数）であること                               | 400 Bad Request  |
| 3   | 認証情報       | `authUser` が context に存在すること                       | 401 Unauthorized |
| 4   | `id`           | 親グループの存在チェックは行わない（不存在は空配列で返す） | —                |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `GET /api/v1/groups/:id/subgroups`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

#### バックエンド処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/groups/:id/subgroups）を受信
3. AuthMiddleware を通過し、ListSubgroups ハンドラに到達
4. パスパラメータ id を `parsePathID` でパースする
   - パース失敗または 0 以下の場合 → 400 Bad Request { "message": "given param is not valid" } → 終了
5. context から authUser を取得する
   - 取得失敗 → 401 Unauthorized { "message": "..." } → 終了
6. サービス層に委譲（GroupService.ListSubgroups(ctx, id) を呼び出し）
7. サービス層で id が 1 未満かどうかを確認する
   - 1 未満の場合 → 400 Bad Request → 終了
8. GroupRelationRepository.ListChildren で子グループ一覧を取得する
   - DB エラーの場合 → 500 Internal Server Error { "message": "internal server error" } → 終了
   - 親グループに子グループなし、または親グループ不存在 → 空スライス（[]）を使用する
9. handler 層の専用レスポンス型（subgroupListResponse）に詰めて 200 OK を返す → 終了
   ※ 要素の DTO は既存 subgroupSummary { id, name, description, member_count } を再利用する
```

> 写経元は `GetByID`（`internal/rest/group.go`）。`parsePathID` → `authUser` 取得 → `service` 呼び出しの順序に揃える。

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### エンドポイント: `GET /api/v1/groups/:id/subgroups`

凡例: `→` = 次の処理へ進む / 終了 = 処理終了

```
1. 開始
2. ユーザーが「サブグループを管理」を押下し SubgroupManagementSheet をマウント
3. SubgroupManagementSheet 内の useSubgroups(groupId) が GET /api/v1/groups/:id/subgroups を 1 回送信
4. レスポンス受信
   - 成功（200）→ { subgroups: [...] } を state に格納する → 終了
   - 失敗（4xx/5xx）→ コンソールにエラーを記録して終了（loading / error UI は表示しない、現状踏襲）
5. useSubgroups が { subgroups, refetch } を返す
6. SubgroupManagementSheet は subgroups からサブグループカードを描画し、AddSubgroupSheet に subgroups を props で引き続き渡す
7. サブグループ追加・削除後は useSubgroups.refetch() を呼ぶ
   → GET /api/v1/groups/:id/subgroups を再取得し subgroups を更新する
8. シート閉じ後の親側 useGroupDetail 再フェッチは既存仕組み（isSubgroupSheetOpen の enabled フリップ）に任せる
```

> グループ詳細画面（`GroupDetailContent` / `useGroupDetail` / `SubgroupFilterChips` / `useSubgroupFilter`）の取得経路は変更しない。

---

## 確認ステップ 5-3: ファイル配置

**原則: 関与した全ファイルを列挙し、役割は具体的に書く。**

### sample-api

| ファイル                                                 | 役割                                                                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sample-api/internal/rest/group.go`                      | `ListSubgroups` ハンドラ・専用 `subgroupListResponse` 型・ルート登録（`g.GET("/groups/:id/subgroups", h.ListSubgroups)` を `members` ルート直後に追加） |
| `sample-api/internal/rest/group_test.go`                 | `ListSubgroups` Handler ユニットテスト                                                                                                                  |
| `sample-api/internal/rest/mocks/group_service_mock.go`   | 変更不要（`ListSubgroups` は既に `GroupService` IF に存在）                                                                                             |
| `sample-api/group/service.go`                            | 変更不要（`Service.ListSubgroups` を既存利用）                                                                                                          |
| `sample-api/group/service_test.go`                       | 変更不要（`Service.ListSubgroups` の既存テストを継続利用）                                                                                              |
| `sample-api/internal/repository/mysql/group_relation.go` | 変更不要（`ListChildren` を既存利用）                                                                                                                   |

### sample-front

| ファイル                                                                            | 役割                                                                                                                                                                               |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sample-front/src/pages/group-detail/api/fetch-subgroups.ts`                        | 新規。`GET /api/v1/groups/:id/subgroups` を呼び出し `{ subgroups: SubgroupSummary[] }` を返す（`apiFetch` 単純実装）                                                               |
| `sample-front/src/pages/group-detail/model/useSubgroups.ts`                         | 新規。`useEffect + useState + refetchKey` パターンで `subgroups`・`refetch` を返すフック（loading / error UI は露出しない）                                                        |
| `sample-front/src/pages/group-detail/ui/SubgroupManagementSheet.tsx`                | 内部呼び出しを `useGroupDetail(groupId)` から `useSubgroups(groupId)` に置き換え。`AddSubgroupSheet` への subgroups 受け渡しは継続。`refetch` も `useSubgroups.refetch` に切り替え |
| `sample-front/src/pages/group-detail/ui/__tests__/SubgroupManagementSheet.test.tsx` | 既存テストの mock 対象を `useGroupDetail` から `useSubgroups` に変更                                                                                                               |
| `sample-front/src/pages/group-detail/ui/GroupDetailContent.tsx`                     | 変更不要（`SubgroupManagementSheet` 内部の取得元を切り替えるだけのため）                                                                                                           |
| `sample-front/src/pages/group-detail/api/fetch-group.ts`                            | 変更不要                                                                                                                                                                           |
| `sample-front/src/pages/group-detail/model/useGroupDetail.ts`                       | 変更不要                                                                                                                                                                           |
| `sample-front/src/pages/group-detail/model/group-detail.ts`                         | 変更不要（`SubgroupSummary` を流用）                                                                                                                                               |
| `sample-front/src/pages/group-detail/ui/AddSubgroupSheet.tsx`                       | 変更不要（`subgroups: SubgroupSummary[]` を props で受け取る既存仕様を維持）                                                                                                       |
| `sample-front/src/pages/group-detail/ui/SubgroupFilterChips.tsx`                    | 変更不要                                                                                                                                                                           |
| `sample-front/src/pages/group-detail/model/useSubgroupFilter.ts`                    | 変更不要                                                                                                                                                                           |

> DB スキーマ変更なし（`group_relations` テーブルの既存実装を流用）。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/groups/:id/subgroups`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
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

サブグループなし（親不存在を含む）の場合は `{ "subgroups": [] }`。

### エラーケース一覧

| 条件                               | 発生レイヤー         | ステータス                | レスポンス                                  |
| ---------------------------------- | -------------------- | ------------------------- | ------------------------------------------- |
| `id` が整数に変換不可              | Handler              | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| `id` が 1 未満                     | Handler / Service    | 400 Bad Request           | `{ "message": "given param is not valid" }` |
| `authUser` が context に存在しない | Handler              | 401 Unauthorized          | `{ "message": "..." }`                      |
| DB エラー（`ListChildren` 失敗）   | Repository           | 500 Internal Server Error | `{ "message": "internal server error" }`    |
| 親グループ不存在                   | Service / Repository | 200 OK                    | `{ "subgroups": [] }`（404 にしない）       |
| ネットワークエラー                 | フロントエンド       | —                         | コンソールにエラー記録（UI 表示は無し）     |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/groups/:id/subgroups`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容                      | 入力例                        | 期待結果                               |
| --- | -------- | ------------------------------- | ----------------------------- | -------------------------------------- |
| 1   | 正常系   | subgroups 複数件を返す          | `id=1`、mock が 2 件返す      | 200 OK + `{"subgroups":[{...},{...}]}` |
| 2   | 境界値   | subgroups 0 件（親不存在含む）  | `id=999`、mock が `[]` を返す | 200 OK + `{"subgroups":[]}`            |
| 3   | 異常系   | 文字列を id に指定              | `id=abc`                      | 400 Bad Request                        |
| 4   | 境界値   | `id=0`                          | `id=0`                        | 400 Bad Request                        |
| 5   | 例外処理 | 認証情報なし（authUser 未設定） | authUser = nil                | 401 Unauthorized                       |
| 6   | 例外処理 | サービス層が DB エラーを返す    | mock がエラーを返す           | 500 Internal Server Error              |
| 7   | 外部依存 | サービスへの引数検証            | `id=42`                       | mock が `ctx, id=42` で呼ばれる        |

**FE 単体テスト**:

| #   | ファイル                                                           | 観点     | テスト内容                                                            | 期待結果                                     |
| --- | ------------------------------------------------------------------ | -------- | --------------------------------------------------------------------- | -------------------------------------------- |
| 8   | `pages/group-detail/api/__tests__/fetch-subgroups.test.ts`         | 正常系   | 200 を受け取り subgroups 配列を返す                                   | パース後の `SubgroupSummary[]` を返す        |
| 9   | `pages/group-detail/api/__tests__/fetch-subgroups.test.ts`         | 境界値   | 0 件レスポンス                                                        | 空配列を返す                                 |
| 10  | `pages/group-detail/api/__tests__/fetch-subgroups.test.ts`         | 異常系   | エラーレスポンスで throw する                                         | エラーが throw される                        |
| 11  | `pages/group-detail/model/__tests__/useSubgroups.test.ts`          | 状態変化 | 初回マウントで取得し subgroups を反映                                 | subgroups が反映され、refetch を呼ぶと再取得 |
| 12  | `pages/group-detail/model/__tests__/useSubgroups.test.ts`          | 異常系   | 取得失敗時はコンソールエラー（UI 露出はなし）                         | state は空のまま、エラーログが出る           |
| 13  | `pages/group-detail/ui/__tests__/SubgroupManagementSheet.test.tsx` | 仕様     | mock を `useSubgroups` に置き換えて既存表示挙動が変わらないこと       | 既存テストと同等のアサーションが pass する   |
| 14  | `pages/group-detail/ui/__tests__/SubgroupManagementSheet.test.tsx` | 仕様     | `useSubgroups` の subgroups を `AddSubgroupSheet` に props で渡すこと | AddSubgroupSheet が同じ subgroups を受け取る |

---

## 最低要件

1. `GET /api/v1/groups/:id/subgroups` が `{ "subgroups": [...] }` を返す（要素は `subgroupSummary { id, name, description, member_count }`）
2. `id` が整数でない / 0 以下の場合に 400 を返す
3. `authUser` が取得できない場合に 401 を返す
4. DB エラー（`ListChildren` 失敗）で 500 を返す
5. 親グループ不存在の場合は 404 ではなく `200 OK { "subgroups": [] }` を返す
6. 既存 `GET /api/v1/groups/:id` のレスポンス・挙動は変更しない（`subgroups` フィールドは互換維持）
7. `SubgroupManagementSheet` は内部で `useSubgroups(groupId)` を呼び、グループ詳細画面の取得経路には影響を与えない
8. `AddSubgroupSheet` は引き続き `subgroups` を props で受け取る（内部フェッチなし）
9. `useSubgroups` は既存慣習（`useEffect + useState + refetchKey`）に従う。loading / error の UI 表示は行わない

---

## 対象外

- AuthMiddleware の改修・新たな認可ロジックの追加（既存 AuthMiddleware を流用し、ハンドラ層では写経元 `GetByID` と同様に `c.Get("authUser")` で取得できることを確認するのみとする）
- ページネーション・カーソル・検索フィルタ
- subgroup の追加・削除（`add-subgroup` / `delete-subgroup` で別途管理）
- グループ詳細画面（`GroupDetailContent` / `useGroupDetail` / `SubgroupFilterChips` / `useSubgroupFilter`）への変更
- 既存 `GET /api/v1/groups/:id` のレスポンス変更
