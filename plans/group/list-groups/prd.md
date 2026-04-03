# PRD: list-groups

## 概要

| 項目 | 内容 |
|---|---|
| 機能名 | `list-groups` |
| 目的 | グループを検索キーワード・ページ条件で絞り込んで一覧取得する |
| API | `GET /api/v1/groups` |
| 認証 | 不要 |
| データソース | MySQL (`sample-api/internal/repository/mysql`) |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups`

#### リクエスト仕様

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `page` | integer (query) | ✓ | 取得するページ番号。1 以上 |
| `limit` | integer (query) | ✓ | 1 ページあたりの件数。1〜100 |
| `search` | string (query) | — | 検索キーワード。スペース区切りで AND 検索（name / description が対象） |

#### バリデーション一覧

| # | 対象フィールド | ルール | エラー時の挙動 |
|---|---|---|---|
| 1 | `page` | 必須（空文字・未指定不可） | 400 Bad Request |
| 2 | `page` | 整数に変換できること | 400 Bad Request |
| 3 | `page` | 1 以上（Handler では非チェック、Service で `page < 1` を拒否） | 400 Bad Request |
| 4 | `limit` | 必須（空文字・未指定不可） | 400 Bad Request |
| 5 | `limit` | 整数に変換できること | 400 Bad Request |
| 6 | `limit` | 1 以上 100 以下（Service で `limit < 1 \|\| limit > 100` を拒否） | 400 Bad Request |
| 7 | `search` | 任意。未指定の場合は空文字として扱い全件対象 | — |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `GET /api/v1/groups`

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/groups）を受信
3. page / limit クエリパラメータの存在チェック
   - 空文字または未指定の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
4. page / limit を整数にパース
   - パース失敗の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
5. search クエリパラメータを取得（未指定の場合は空文字）
6. Service.ListGroups(ctx, search, page, limit) を呼び出す
7. Service 内バリデーション
   - page < 1 の場合 → ErrBadParamInput を返す → 400 Bad Request
   - limit < 1 または limit > 100 の場合 → ErrBadParamInput を返す → 400 Bad Request
8. Repository.ListGroups(ctx, search, page, limit) を呼び出す
9. DB: groups テーブルと group_members を LEFT JOIN してカウント・一覧を取得
   - search が空でない場合 → name / description に LIKE 検索（AND 条件）
   - total = 0 の場合 → 空配列を返す（DB SELECT をスキップ）
10. DB エラーの場合
    - 500 Internal Server Error { "message": "internal server error" } を返す
    - 終了
11. 成功の場合
    - 200 OK + GroupListResponse を返す
    - 終了
```

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md#group--list-groups](../../schema.md#group--list-groups) を参照。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/groups`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "groups": [
    {
      "id": 1,
      "name": "dev-team",
      "description": "developers",
      "member_count": 3
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

### エラーケース一覧

| 条件 | 発生レイヤー | ステータス | レスポンス |
|---|---|---|---|
| `page` または `limit` が未指定 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| `page` または `limit` が整数に変換不可 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| `page < 1` | Service | 400 Bad Request | `{ "message": "given param is not valid" }` |
| `limit < 1` または `limit > 100` | Service | 400 Bad Request | `{ "message": "given param is not valid" }` |
| DB エラー（COUNT / SELECT 失敗） | Repository | 500 Internal Server Error | `{ "message": "internal server error" }` |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/groups`

| # | 観点 | テスト内容 | 入力例 | 期待結果 |
|---|---|---|---|---|
| 1 | 正常系 | 有効な page / limit で一覧が返る | `?page=1&limit=20` | 200 OK / GroupListResponse |
| 2 | 正常系 | search なしで全件取得 | `?page=1&limit=10` | 200 OK / 全グループ |
| 3 | 正常系 | search キーワードで絞り込み | `?search=dev&page=1&limit=20` | 200 OK / マッチしたグループ |
| 4 | 異常系 | page が未指定 | `?limit=10` | 400 Bad Request |
| 5 | 異常系 | limit が未指定 | `?page=1` | 400 Bad Request |
| 6 | 異常系 | page が整数でない | `?page=abc&limit=10` | 400 Bad Request |
| 7 | 異常系 | limit が整数でない | `?page=1&limit=abc` | 400 Bad Request |
| 8 | 境界値 | page = 0（Service で拒否） | `?page=0&limit=10` | 400 Bad Request |
| 9 | 境界値 | limit = 0（Service で拒否） | `?page=1&limit=0` | 400 Bad Request |
| 10 | 境界値 | limit = 101（Service で拒否） | `?page=1&limit=101` | 400 Bad Request |
| 11 | 境界値 | limit = 1（最小値、正常） | `?page=1&limit=1` | 200 OK |
| 12 | 境界値 | limit = 100（最大値、正常） | `?page=1&limit=100` | 200 OK |
| 13 | 例外処理 | DB エラー時に 500 を返す | Service が ErrInternalServerError を返す | 500 Internal Server Error |
| 14 | 外部依存 | Service をモックで切り分け | mockGroupService | Handler 単体でテスト可能 |
| 15 | 外部依存 | Repository をモックで切り分け | mockGroupRepository | Service 単体でテスト可能 |

---

## ファイル配置

### sample-api

| ファイル | 役割 |
|---|---|
| `sample-api/domain/group.go` | Group Entity・Pagination・GroupListResponse・エラー定義 |
| `sample-api/group/service.go` | GroupRepository interface・ListGroups ビジネスロジック |
| `sample-api/group/service_test.go` | Service ユニットテスト |
| `sample-api/group/mocks/group_repository_mock.go` | GroupRepository の手動 mock |
| `sample-api/internal/rest/group.go` | HTTP Handler（ListGroups） |
| `sample-api/internal/rest/group_test.go` | Handler ユニットテスト |
| `sample-api/internal/rest/mocks/group_service_mock.go` | GroupService の手動 mock |
| `sample-api/internal/rest/errors.go` | ResponseError・getStatusCode |
| `sample-api/internal/repository/mysql/group.go` | MySQL 実装（countGroups / selectGroups） |
| `sample-api/db/migrations/001_create_groups_tables.sql` | `groups` / `group_members` テーブル定義 |
| `sample-api/db/migrations/002_seed_groups.sql` | シードデータ |

---

## 最低要件

1. `page` と `limit` は必須クエリパラメータ。未指定または整数でない場合は 400 を返す
2. `page` は 1 以上、`limit` は 1〜100 の範囲で受け付ける
3. `search` は任意。未指定の場合は全件を対象とする
4. search はスペース区切りで AND 検索（name / description が対象）
5. レスポンスに groups 配列と pagination（total / page / limit）を含める
6. 該当グループが 0 件の場合は空配列を返す（エラーにしない）
7. DB エラーは 500 で返す

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- グループの作成・更新・削除
- ソート順の変更（固定: id DESC）
