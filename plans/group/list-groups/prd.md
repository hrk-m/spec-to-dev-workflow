# PRD: list-groups

## 概要

| 項目 | 内容 |
|---|---|
| 機能名 | `list-groups` |
| 目的 | グループをキーワード・offset 条件で絞り込んで一覧取得する。フロントエンドは 500 件一括取得してクライアントキャッシュで表示する |
| API | `GET /api/v1/groups` |
| 認証 | 不要 |
| データソース | MySQL (`sample-api/internal/repository/mysql`) |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups`

#### リクエスト仕様

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `q` | string (query) | — | 検索キーワード。name / description の LIKE 検索 |
| `limit` | integer (query) | — | 取得件数上限。1〜500（デフォルト: 500） |
| `offset` | integer (query) | — | 取得開始位置。0 以上（デフォルト: 0） |

#### バリデーション一覧

| # | 対象フィールド | ルール | エラー時の挙動 |
|---|---|---|---|
| 1 | `limit` | 指定される場合は整数に変換できること | 400 Bad Request |
| 2 | `limit` | 指定される場合は 1 以上 500 以下であること | 400 Bad Request |
| 3 | `offset` | 指定される場合は整数に変換できること | 400 Bad Request |
| 4 | `offset` | 指定される場合は 0 以上であること | 400 Bad Request |

---

## 確認ステップ 5-2: 処理フロー

### エンドポイント: `GET /api/v1/groups`

#### フロントエンド 処理フロー

```
1. 開始
2. HomePage コンポーネントがマウントされる
3. HomePage → API クライアント: GET /api/v1/groups?limit=500&offset=0 を送信
4. レスポンスは成功？
   - Yes（200）→
      5. 取得したグループ一覧（最大 500 件）と total を state にキャッシュ
      6. 画面にデフォルト 20 件/ページで表示
      7. ページネーション（20 / 50 / 100 件/ページ切り替え）を UI に表示
      8. 終了
   - No（4xx・5xx）→
      5. エラーメッセージを画面に表示
      6. 終了
9. ユーザーが表示ページを進め、キャッシュ済みの 500 件を超えるページに到達
10. HomePage → API クライアント: GET /api/v1/groups?limit=500&offset=500 を送信
11. 手順 4 と同様（取得データを既存 state に追加キャッシュ）
12. ユーザーが検索キーワードを入力
13. HomePage → API クライアント: GET /api/v1/groups?limit=500&offset=0&q={keyword} を送信
14. 手順 4 と同様（キャッシュをクリアして再キャッシュ）
```

#### バックエンド 処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/groups）を受信
3. クエリパラメータ（q / limit / offset）を取得
4. limit が指定されている場合はパース・バリデーション
   - 整数でない / 1 未満 / 500 超の場合 → 400 Bad Request
5. offset が指定されている場合はパース・バリデーション
   - 整数でない / 0 未満の場合 → 400 Bad Request
6. Service.ListGroups(ctx, q, limit, offset) を呼び出す
7. Repository.ListGroups(ctx, q, limit, offset) を呼び出す
8. DB: groups テーブルと group_members を LEFT JOIN してカウント・一覧を取得
   - q が指定されている場合: スペース区切りのトークンごとに AND 結合で絞り込む
     各トークン: `(g.name LIKE '%token%' OR g.description LIKE '%token%')`
   - LIMIT :limit OFFSET :offset
   - total: フィルターなしのグループ全件数を COUNT で取得（`countGroups` が先行実行）
9. DB エラーの場合
   - 500 Internal Server Error { "message": "internal server error" } を返す
   - 終了
10. 成功の場合
    - 200 OK + `groupListResponse{Groups: groups, Total: total}` を返す（Handler ローカル型）
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
  "total": 42
}
```

※ `total`: フィルターなしのグループ全件数
※ `groups`: 今回のフェッチで返ったグループ一覧（最大 500 件）

### エラーケース一覧

| 条件 | 発生レイヤー | ステータス | レスポンス |
|---|---|---|---|
| `limit` が整数に変換不可 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| `limit` が 1〜500 の範囲外 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| `offset` が整数に変換不可 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| `offset` が 0 未満 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| DB エラー（COUNT / SELECT 失敗） | Repository | 500 Internal Server Error | `{ "message": "internal server error" }` |
| ネットワークエラー | フロントエンド: API クライアント層 | — | エラーメッセージ表示 |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/groups`

| # | 観点 | テスト内容 | 入力例 | 期待結果 |
|---|---|---|---|---|
| 1 | 正常系 | パラメータなしでデフォルト値が適用される | `（パラメータなし）` | 200 OK / limit=500, offset=0 で取得 |
| 2 | 正常系 | q なしで全件取得 | `?limit=20&offset=0` | 200 OK / 全グループ + total |
| 3 | 正常系 | q キーワードで絞り込み | `?q=dev&limit=20` | 200 OK / マッチしたグループ |
| 4 | 正常系 | offset 指定で次の 500 件を取得 | `?limit=500&offset=500` | 200 OK / 次の 500 件 |
| 5 | 正常系 | グループが 0 件の場合 | `（グループが存在しない状態）` | 200 OK / groups=[] + total=0 |
| 6 | 異常系 | limit が整数でない | `?limit=abc` | 400 Bad Request |
| 7 | 境界値 | limit=500（上限） | `?limit=500` | 200 OK |
| 8 | 境界値 | limit=501（上限超え） | `?limit=501` | 400 Bad Request |
| 9 | 境界値 | limit=0 | `?limit=0` | 400 Bad Request |
| 10 | 境界値 | offset=0（最小値） | `?offset=0` | 200 OK |
| 11 | 境界値 | offset=-1（最小値未満） | `?offset=-1` | 400 Bad Request |
| 12 | 例外処理 | DB エラー時に 500 を返す | DB mock がエラーを返す | 500 Internal Server Error |
| 13 | 外部依存 | Service をモックで切り分け | mockGroupService | Handler 単体でテスト可能 |
| 14 | 外部依存 | Repository をモックで切り分け | mockGroupRepository | Service 単体でテスト可能 |

---

## ファイル配置

### sample-api

| ファイル | 役割 |
|---|---|
| `sample-api/domain/group.go` | Group Entity（id, name, description, member_count）・GroupMember Entity |
| `sample-api/group/service.go` | GroupRepository interface の ListGroups シグネチャ変更・ビジネスロジック更新 |
| `sample-api/group/service_test.go` | Service ユニットテスト更新 |
| `sample-api/group/mocks/group_repository_mock.go` | GroupRepository の手動 mock 更新（ListGroups シグネチャ変更） |
| `sample-api/internal/rest/group.go` | HTTP Handler（ListGroups）・GroupService interface・Handler ローカルの `groupListResponse` / `groupMemberListResponse` 型定義 |
| `sample-api/internal/rest/group_test.go` | Handler ユニットテスト更新 |
| `sample-api/internal/rest/mocks/group_service_mock.go` | GroupService の手動 mock 更新（ListGroups シグネチャ変更） |
| `sample-api/internal/repository/mysql/group.go` | MySQL 実装更新（page → offset 変換削除、q パラメータ名変更） |
| `sample-api/db/migrations/001_create_groups_tables.sql` | テーブル定義・マイグレーション |

### sample-front

| ファイル | 役割 |
|---|---|
| `sample-front/src/pages/home/api/fetch-groups.ts` | GET /api/v1/groups 呼び出し（search/page → q/offset/limit に変更） |
| `sample-front/src/pages/home/model/useGroupList.ts` | グループ一覧取得・クライアントサイドページネーションカスタムフック（全面書き換え） |
| `sample-front/src/pages/home/ui/GroupList.tsx` | グループ一覧コンポーネント（Load More → Previous/Next + 20/50/100 件/ページ切り替え）|

---

## 最低要件

1. `GET /api/v1/groups` が `q`（任意）・`limit`（任意、デフォルト 500, 1〜500）・`offset`（任意、デフォルト 0, 0 以上）を受け付ける
2. `search`・`page` パラメータは削除する（後方互換は提供しない）
3. `limit` が 1〜500 の範囲外の場合に 400 を返す
4. `offset` が 0 未満の場合に 400 を返す
5. `q` が指定された場合、グループの name / description で LIKE 検索が動作する
6. レスポンスが `{ "groups": [...], "total": N }` 形式を返す（`pagination` オブジェクト廃止）
7. `total` は `q` フィルターなしのグループ全件数を返す
8. 該当グループが 0 件の場合は空配列を返す（エラーにしない）
9. DB エラーは 500 で返す
10. フロントエンドが 500 件一括取得 → クライアントキャッシュ → スライス表示する
11. フロントエンドの UI が Previous/Next ボタン + 20/50/100 件/ページ切り替えを表示する（Load More 廃止）

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- グループの作成・更新・削除
- ソート順の変更（固定: id DESC）
