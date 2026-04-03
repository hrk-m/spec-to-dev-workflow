# PRD: list-group-members

## 概要

| 項目 | 内容 |
|---|---|
| 機能名 | `list-group-members` |
| 目的 | グループに所属するメンバー一覧を取得する。グループ詳細画面のメンバー一覧表示に使用 |
| API | `GET /api/v1/groups/:id/members` |
| 認証 | 不要 |
| データソース | MySQL (`sample-api/internal/repository/mysql`) |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/groups/:id/members`

#### リクエスト仕様

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | integer (path) | ✓ | グループの ID。正の整数 |
| `limit` | integer (query) | — | 取得件数上限。1〜500（デフォルト: 500） |
| `offset` | integer (query) | — | 取得開始位置。0 以上（デフォルト: 0） |
| `q` | string (query) | — | 検索キーワード。first_name OR last_name の LIKE 検索 |

#### バリデーション一覧

| # | 対象フィールド | ルール | エラー時の挙動 |
|---|---|---|---|
| 1 | `id` | 整数に変換できること | 400 Bad Request |
| 2 | `id` | 1 以上（正の整数）であること | 400 Bad Request |
| 3 | `id` | DB 上に該当グループが存在すること | 404 Not Found |
| 4 | `limit` | 指定される場合は整数に変換できること | 400 Bad Request |
| 5 | `limit` | 指定される場合は 1 以上 500 以下であること | 400 Bad Request |
| 6 | `offset` | 指定される場合は整数に変換できること | 400 Bad Request |
| 7 | `offset` | 指定される場合は 0 以上であること | 400 Bad Request |

---

## 確認ステップ 5-2: 処理フロー

### エンドポイント: `GET /api/v1/groups/:id/members`

#### フロントエンド 処理フロー

```
1. 開始
2. GroupDetailPage コンポーネントがマウントされる
3. GroupDetailPage → API クライアント: GET /api/v1/groups/:id/members?limit=500&offset=0 を送信
4. レスポンスは成功？
   - Yes（200）→
      5. 取得したメンバー一覧（最大 500 件）と total を state にキャッシュ
      6. 画面にデフォルト 20 件/ページで表示
      7. ページネーション（20 / 50 / 100 件/ページ切り替え）を UI に表示
      8. 終了
   - No（4xx・5xx）→
      5. エラーメッセージを画面に表示
      6. 終了
9. ユーザーが表示ページを進め、キャッシュ済みの 500 件を超えるページに到達
10. GroupDetailPage → API クライアント: GET /api/v1/groups/:id/members?limit=500&offset=500 を送信
11. 手順 4 と同様（取得データを既存 state に追加キャッシュ）
12. ユーザーが検索キーワードを入力
13. GroupDetailPage → API クライアント: GET /api/v1/groups/:id/members?limit=500&offset=0&q={keyword} を送信
14. 手順 4 と同様
```

#### バックエンド 処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/groups/:id/members）を受信
3. パスパラメータ id を c.Param("id") で取得、クエリパラメータを取得
4. id を整数にパース
   - パース失敗の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
5. id < 1 の場合
   - 400 Bad Request { "message": "given param is not valid" } を返す
   - 終了
6. limit が指定されている場合はパース・バリデーション
   - 整数でない / 1 未満 / 500 超の場合 → 400 Bad Request
7. offset が指定されている場合はパース・バリデーション
   - 整数でない / 0 未満の場合 → 400 Bad Request
8. Service.ListGroupMembers(ctx, id, limit, offset, q) を呼び出す
9. Repository.GetByID(ctx, id) でグループ存在確認
   - 存在しない（ErrNotFound）→
      - 404 Not Found { "message": "not found" } を返す
      - 終了
10. Repository.ListGroupMembers(ctx, id, limit, offset, q) を呼び出す
11. DB: group_members JOIN users WHERE group_id = :id
    - q が指定されている場合: users.first_name LIKE '%q%' OR users.last_name LIKE '%q%'
    - LIMIT :limit OFFSET :offset
    - total: フィルターなしの GROUP の全メンバー数を COUNT で取得
12. DB エラーの場合
    - 500 Internal Server Error { "message": "internal server error" } を返す
    - 終了
13. 成功の場合
    - 200 OK + GroupMemberListResponse を返す
    - 終了
```

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md#group--list-group-members](../../schema.md#group--list-group-members) を参照。

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/groups/:id/members`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "members": [
    {
      "id": 1,
      "first_name": "太郎",
      "last_name": "山田"
    }
  ],
  "total": 250
}
```

※ `total`: フィルターなしのグループの全メンバー数
※ `members`: 今回のフェッチで返ったメンバー一覧（最大 500 件）

### エラーケース一覧

| 条件 | 発生レイヤー | ステータス | レスポンス |
|---|---|---|---|
| `id` が整数に変換不可 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| `id` が 1 未満 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| `limit` が整数でない / 1〜500 の範囲外 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| `offset` が整数でない / 0 未満 | Handler | 400 Bad Request | `{ "message": "given param is not valid" }` |
| 対象グループが存在しない | Service / Repository | 404 Not Found | `{ "message": "not found" }` |
| DB エラー | Repository | 500 Internal Server Error | `{ "message": "internal server error" }` |
| ネットワークエラー | フロントエンド: API クライアント層 | — | エラーメッセージ表示 |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/groups/:id/members`

| # | 観点 | テスト内容 | 入力例 | 期待結果 |
|---|---|---|---|---|
| 1 | 正常系 | メンバーが存在するグループのリスト取得 | `id=1, limit=500` | 200 OK + members 配列 + total |
| 2 | 正常系 | 検索キーワードでメンバー絞り込み | `id=1, q="山田"` | 200 OK + 該当メンバーのみ |
| 3 | 正常系 | offset 指定で次の 500 件を取得 | `id=1, offset=500` | 200 OK + 次の 500 件 |
| 4 | 正常系 | メンバーが 0 人のグループ | `id=2`（メンバー 0） | 200 OK + members=[] + total=0 |
| 5 | 異常系 | 存在しないグループ ID | `id=9999` | 404 Not Found |
| 6 | 異常系 | id が文字列 | `id="abc"` | 400 Bad Request |
| 7 | 境界値 | limit=500（上限） | `limit=500` | 200 OK |
| 8 | 境界値 | limit=501（上限超え） | `limit=501` | 400 Bad Request |
| 9 | 境界値 | limit=0 | `limit=0` | 400 Bad Request |
| 10 | 境界値 | offset=0（最小値） | `offset=0` | 200 OK |
| 11 | 境界値 | offset=-1（最小値未満） | `offset=-1` | 400 Bad Request |
| 12 | 例外処理 | DB 接続エラー発生時 | DB mock がエラーを返す | 500 Internal Server Error |
| 13 | 外部依存 | Service をモックで切り分け | mockGroupService | Handler 単体でテスト可能 |
| 14 | 外部依存 | Repository をモックで切り分け | mockGroupRepository | Service 単体でテスト可能 |

---

## ファイル配置

### sample-api

| ファイル | 役割 |
|---|---|
| `sample-api/domain/user.go` | User Entity（id, first_name, last_name） |
| `sample-api/domain/group.go` | GroupMemberListResponse 追加 |
| `sample-api/group/service.go` | GroupRepository interface に ListGroupMembers 追加・ListGroupMembers ビジネスロジック |
| `sample-api/group/service_test.go` | Service ユニットテスト（ListGroupMembers）|
| `sample-api/group/mocks/group_repository_mock.go` | GroupRepository の手動 mock（ListGroupMembers 追加）|
| `sample-api/internal/rest/group.go` | HTTP Handler（ListGroupMembers）・GroupService interface に ListGroupMembers 追加・ルート登録（GET /api/v1/groups/:id/members） |
| `sample-api/internal/rest/group_test.go` | Handler ユニットテスト（ListGroupMembers）|
| `sample-api/internal/rest/mocks/group_service_mock.go` | GroupService の手動 mock（ListGroupMembers 追加）|
| `sample-api/internal/repository/mysql/group.go` | MySQL 実装（ListGroupMembers）|
| `sample-api/db/migrations/003_create_users_and_update_group_members.sql` | users テーブル作成・group_members テーブル変更（user_id FK 追加、name カラム削除） |

### sample-front

| ファイル | 役割 |
|---|---|
| `sample-front/src/pages/group-detail/ui/MemberList.tsx` | メンバー一覧コンポーネント（20/50/100 件/ページ切り替え） |
| `sample-front/src/pages/group-detail/api/fetch-group-members.ts` | GET /api/v1/groups/:id/members 呼び出し |
| `sample-front/src/pages/group-detail/model/useMemberList.ts` | メンバー一覧取得・クライアントサイドページネーションカスタムフック |

---

## 最低要件

1. `GET /api/v1/groups/:id/members` が実装されており、メンバー一覧（id, first_name, last_name）と total を返す
2. `users` テーブルが作成されている（id, first_name, last_name）
3. `group_members` テーブルが `user_id`（FK→users）を持つ構成に更新されている
4. `id` が整数でない / 0 以下の場合に 400 を返す
5. `limit` が 1〜500 の範囲外の場合に 400 を返す
6. 対象グループが存在しない場合に 404 を返す
7. `q` パラメータで first_name OR last_name の LIKE 検索が動作する
8. 詳細ページにメンバー一覧がデフォルト 20 件/ページで表示される（20/50/100 切り替え可）
9. 500 件を超えるメンバーがいる場合、追加フェッチ（offset 増加）が実行される

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- メンバーの追加・削除
- ページネーション（サーバーサイド）— クライアントサイドページネーションのみ対応
