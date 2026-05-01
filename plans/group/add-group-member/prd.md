# PRD: add-group-member

## 概要

| 項目         | 内容                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 機能名       | `add-group-member`                                                                                                          |
| 目的         | グループ詳細画面からユーザーをグループに追加できるようにする                                                                |
| API          | `GET /api/v1/groups/:id/non-members`（グループ未所属ユーザー一覧取得）<br>`POST /api/v1/groups/:id/members`（メンバー追加） |
| 認証         | 必要（AuthMiddleware）                                                                                                      |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                                                              |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント 1: `GET /api/v1/groups/:id/non-members`

#### リクエスト仕様

| フィールド | 型              | 必須 | 説明                                               |
| ---------- | --------------- | ---- | -------------------------------------------------- |
| `id`       | integer (path)  | ✓    | グループの ID。正の整数                            |
| `q`        | string (query)  | —    | 検索キーワード。`search_key LIKE '%q%'` で絞り込み |
| `limit`    | integer (query) | —    | 取得件数上限。1〜500（デフォルト: 500）            |
| `offset`   | integer (query) | —    | 取得開始位置。0 以上（デフォルト: 0）              |

#### バリデーション一覧

| #   | 対象フィールド | ルール                                     | エラー時の挙動  |
| --- | -------------- | ------------------------------------------ | --------------- |
| 1   | `id`           | 整数に変換できること                       | 400 Bad Request |
| 2   | `id`           | 1 以上（正の整数）であること               | 400 Bad Request |
| 3   | `id`           | DB 上に該当グループが存在すること          | 404 Not Found   |
| 4   | `limit`        | 指定される場合は整数に変換できること       | 400 Bad Request |
| 5   | `limit`        | 指定される場合は 1 以上 500 以下であること | 400 Bad Request |
| 6   | `offset`       | 指定される場合は整数に変換できること       | 400 Bad Request |
| 7   | `offset`       | 指定される場合は 0 以上であること          | 400 Bad Request |

---

### エンドポイント 2: `POST /api/v1/groups/:id/members`

#### リクエスト仕様

| フィールド | 型             | 必須 | 説明                                           |
| ---------- | -------------- | ---- | ---------------------------------------------- |
| `id`       | integer (path) | ✓    | グループの ID。正の整数                        |
| `user_ids` | array (body)   | ✓    | 追加するユーザー ID の配列。1 件以上であること |

#### バリデーション一覧

| #   | 対象フィールド | ルール                                                | エラー時の挙動  |
| --- | -------------- | ----------------------------------------------------- | --------------- |
| 1   | `id`           | 整数に変換できること                                  | 400 Bad Request |
| 2   | `id`           | 1 以上（正の整数）であること                          | 400 Bad Request |
| 3   | `id`           | DB 上に該当グループが存在すること                     | 404 Not Found   |
| 4   | `user_ids`     | リクエストボディに含まれること                        | 400 Bad Request |
| 5   | `user_ids`     | 空配列でないこと（1 件以上）                          | 400 Bad Request |
| 6   | `user_ids`     | 各 user_id が DB 上に存在すること                     | 404 Not Found   |
| 7   | `user_ids`     | いずれかの user_id がすでにグループメンバーでないこと | 409 Conflict    |

---

## 確認ステップ 5-2: 処理フロー

### エンドポイント 1: `GET /api/v1/groups/:id/non-members`

#### バックエンド 処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（GET /api/v1/groups/:id/non-members）を受信
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
8. Service.ListNonGroupMembers(ctx, id, limit, offset, q) を呼び出す
9. Repository.GetByID(ctx, id) でグループ存在確認
   - 存在しない（ErrNotFound）→
      - 404 Not Found { "message": "your requested item is not found" } を返す
      - 終了
10. Repository.ListNonGroupMembers(ctx, id, limit, offset, q) を呼び出す
11. DB: users WHERE id NOT IN (SELECT user_id FROM group_members WHERE group_id = :id) AND users.deleted_at IS NULL
    - q が指定されている場合: search_key LIKE '%q%'
    - ORDER BY id ASC
    - LIMIT :limit OFFSET :offset
    - total: フィルターなしの未所属ユーザー全件数を COUNT で取得（deleted_at IS NULL のユーザーのみ対象）
12. DB エラーの場合
    - 500 Internal Server Error { "message": "internal server error" } を返す
    - 終了
13. 成功の場合
    - 200 OK + nonMemberListResponse を返す
    - 終了
```

#### フロントエンド 処理フロー（AddMemberSheet マウント時）

```
1. 開始
2. AddMemberSheet がマウントされる（シートが開かれる）
3. useEffect が実行される（deps: [groupId]）
4. clearNonMemberListCache(groupId) を呼び出して非メンバーリストキャッシュをクリア
5. useNonMemberList(groupId) がキャッシュなしの状態で初期化される
   ※ clearNonMemberListCache(groupId) は useNonMemberList(groupId) 呼び出しより前に実行する
6. GET /api/v1/groups/:id/non-members?limit=100&offset=0 を送信（最新データを取得）
7. 終了
```

#### フロントエンド 処理フロー（AddMemberSheet 内の検索）

```
1. 開始
2. GroupDetailContent に「メンバー追加」ボタンを表示
3. ユーザーがボタンをクリック
4. AddMemberSheet を SheetStack に登録して表示
5. シートがマウントされ、GET /api/v1/groups/:id/non-members?limit=100&offset=0 を送信
6. レスポンスは成功？
   - Yes（200）→ 取得した users と total を state にキャッシュし、一覧を表示
   - No（4xx・5xx）→ シート内にエラーメッセージを表示
7. ユーザーが検索キーワードを入力（300ms デバウンス）
8. GET /api/v1/groups/:id/non-members?q={keyword}&limit=100&offset=0 を送信
9. レスポンスに応じて state を更新・一覧を再描画
10. ユーザーがスクロールし、sentinel 要素が viewport に入り、キャッシュ済みの 100 件を超えるデータが存在する可能性がある場合
11. GET /api/v1/groups/:id/non-members?limit=100&offset=100 を送信
12. 取得データを既存 state に追加キャッシュ
```

---

### エンドポイント 2: `POST /api/v1/groups/:id/members`

#### バックエンド 処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（POST /api/v1/groups/:id/members）を受信
3. パスパラメータ id を c.Param("id") で取得
4. id を整数にパース
   - パース失敗の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
5. id < 1 の場合
   - 400 Bad Request { "message": "given param is not valid" } を返す
   - 終了
6. リクエストボディを Bind して user_ids を取得
   - Bind 失敗 / user_ids が空の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
7. Service.AddGroupMembers(ctx, groupID, userIDs) を呼び出す
8. Repository.GetByID(ctx, groupID) でグループ存在確認
   - 存在しない（ErrNotFound）→
      - 404 Not Found { "message": "your requested item is not found" } を返す
      - 終了
9. UserRepository.CountByIDs(ctx, userIDs) で全ユーザーの存在確認を 1 回の COUNT クエリで行う（WHERE id IN (?) AND deleted_at IS NULL）
   - count != len(userIDs)（1 件でも存在しない）→
      - 404 Not Found { "message": "your requested item is not found" } を返す
      - 終了
10. 各 user_id について group_members に既存レコードがないか確認（重複チェック）
    - 1 件でも重複がある（ErrConflict）→
      - 409 Conflict { "message": "your item already exist" } を返す
      - 終了
11. トランザクションを開始し、全 user_id を group_members へ INSERT
    - UNIQUE 制約エラーが発生した場合 → ロールバックして 409 Conflict を返す
    - その他 DB エラーの場合 → ロールバックして 500 Internal Server Error を返す
12. トランザクションをコミット
13. 追加したユーザー情報（id, first_name, last_name）を取得
14. 201 Created + addGroupMembersResponse を返す
15. 終了
```

#### フロントエンド 処理フロー（AddMemberSheet 内の追加操作）

```
1. ユーザーがチェックボックスで追加対象ユーザーを選択
2. 「一括追加」ボタンをクリック
3. POST /api/v1/groups/:id/members { "user_ids": [...] } を送信
4. レスポンスは成功？
   - Yes（201）→
      5. AddMemberSheet を閉じる
      6. clearMemberListCache() を呼び出してメンバー一覧キャッシュをクリア
      7. useGroupDetail.refetch() を呼び出してグループ詳細（member_count）を更新
      8. 終了
   - No（409）→
      5. シート内にエラーメッセージ「選択したユーザーはすでにメンバーです」を表示
      6. 終了
   - No（その他 4xx・5xx）→
      5. シート内にエラーメッセージを表示
      6. 終了
```

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md](../../schema.md) を参照。

### DB 変更

- `users` テーブルに `search_key` カラムを追加（VIRTUAL GENERATED COLUMN）
  - カラム定義: `search_key VARCHAR(510) GENERATED ALWAYS AS (CONCAT(first_name, last_name, last_name, first_name)) VIRTUAL`
  - 将来的に検索対象カラムを追加する場合は、マイグレーションで式を更新する

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント 1: `GET /api/v1/groups/:id/non-members`

#### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "users": [
    {
      "id": 1,
      "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "first_name": "太郎",
      "last_name": "山田"
    }
  ],
  "total": 10
}
```

※ `total`: フィルターなしの未所属ユーザー全件数
※ `users`: 今回のフェッチで返ったユーザー一覧（最大 500 件）

#### エラーケース一覧

| 条件                                   | 発生レイヤー                       | ステータス                | レスポンス                                          |
| -------------------------------------- | ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可                  | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                         | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `limit` が整数でない / 1〜500 の範囲外 | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `offset` が整数でない / 0 未満         | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| 対象グループが存在しない               | Service / Repository               | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー                              | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| ネットワークエラー                     | フロントエンド: API クライアント層 | —                         | エラーメッセージ表示                                |

---

### エンドポイント 2: `POST /api/v1/groups/:id/members`

#### レスポンス（正常系）

- ステータス: `201 Created`

```json
{
  "members": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440001",
      "first_name": "太郎",
      "last_name": "山田"
    }
  ]
}
```

#### エラーケース一覧

| 条件                                           | 発生レイヤー                       | ステータス                | レスポンス                                            |
| ---------------------------------------------- | ---------------------------------- | ------------------------- | ----------------------------------------------------- |
| `id` が整数に変換不可                          | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`           |
| `id` が 1 未満                                 | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`           |
| `user_ids` が存在しない / 空配列               | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`           |
| 対象グループが存在しない                       | Service / Repository               | 404 Not Found             | `{ "message": "your requested item is not found" }`   |
| `user_ids` 内に存在しないユーザー ID がある    | Service / Repository               | 404 Not Found             | `{ "message": "your requested item is not found" }`   |
| `user_ids` 内にすでにメンバーの user_id がある | Service / Repository               | 409 Conflict              | `{ "message": "your item already exist" }` |
| UNIQUE 制約エラー（並行リクエスト）            | Repository                         | 409 Conflict              | `{ "message": "your item already exist" }` |
| DB エラー                                      | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`              |
| ネットワークエラー                             | フロントエンド: API クライアント層 | —                         | エラーメッセージ表示                                  |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント 1: `GET /api/v1/groups/:id/non-members`

| #   | 観点     | テスト内容                         | 入力例                 | 期待結果                    |
| --- | -------- | ---------------------------------- | ---------------------- | --------------------------- |
| 1   | 正常系   | q なしで未所属ユーザー全件取得     | `id=1`                 | 200 OK + users 配列 + total |
| 2   | 正常系   | q ありで search_key フィルタリング | `id=1, q="山田"`       | 200 OK + 該当ユーザーのみ   |
| 3   | 正常系   | 全員グループ参加済みの場合         | `id=1`（全員加入済み） | 200 OK + users=[] + total=0 |
| 4   | 異常系   | 存在しないグループ ID              | `id=9999`              | 404 Not Found               |
| 5   | 外部依存 | Service をモックで切り分け         | mockGroupService       | Handler 単体でテスト可能    |
| 6   | 外部依存 | Repository をモックで切り分け      | mockGroupRepository    | Service 単体でテスト可能    |

---

### エンドポイント 2: `POST /api/v1/groups/:id/members`

| #   | 観点     | テスト内容                      | 入力例                           | 期待結果                   |
| --- | -------- | ------------------------------- | -------------------------------- | -------------------------- |
| 1   | 正常系   | 正常にメンバー追加              | `id=1, user_ids=[2,3]`           | 201 Created + members 配列 |
| 2   | 異常系   | グループ未存在                  | `id=9999, user_ids=[1]`          | 404 Not Found              |
| 3   | 異常系   | user_id が存在しない            | `id=1, user_ids=[9999]`          | 404 Not Found              |
| 4   | 異常系   | すでにメンバーの user_id を含む | `id=1, user_ids=[1]`（1 は既存） | 409 Conflict               |
| 5   | 外部依存 | Service をモックで切り分け      | mockGroupService                 | Handler 単体でテスト可能   |
| 6   | 外部依存 | Repository をモックで切り分け   | mockGroupRepository              | Service 単体でテスト可能   |

---

### フロントエンド テストケース

| #   | 観点   | テスト内容                                                         | 期待結果                                                         |
| --- | ------ | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 1   | 正常系 | 「メンバー追加」ボタンで AddMemberSheet が開く                     | シートが表示され未所属ユーザー一覧が描画される                   |
| 2   | 正常系 | 検索入力で未所属ユーザーが絞り込まれる                             | q パラメータつき API が呼ばれ、一覧が更新される                  |
| 3   | 正常系 | 追加成功後に MemberList が再取得される                             | シートが閉じ、MemberList と member_count が更新される            |
| 4   | 異常系 | 409 エラー時にエラーメッセージを表示                               | 「選択したユーザーはすでにメンバーです」が表示される             |
| 5   | 正常系 | AddMemberSheet がマウントされたとき                                | `clearNonMemberListCache(groupId)` が呼ばれる                    |
| 6   | 正常系 | 「一括追加」ボタンが検索フォームの下・ユーザー一覧の上に表示される | DOM 順でボタンが検索フォームより後、ユーザー一覧より前に存在する |
| 7   | 正常系 | シート初期表示時のボタン状態                                       | 選択ゼロのため disabled                                          |
| 8   | 正常系 | チェックボックスを 1 件選択したとき                                | ボタンが活性化される（disabled 解除）                            |
| 9   | 正常系 | 全チェックを外したとき                                             | ボタンが disabled に戻る                                         |
| 10  | 正常系 | 下部に「一括追加」ボタンが存在しない                               | DOM 内に「一括追加」ボタンが 1 つだけ存在する                    |

---

## ファイル配置

### sample-api

| ファイル                                                              | 役割                                                                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `sample-api/domain/user.go`                                           | User Entity（id, first_name, last_name）定義                                                                           |
| `sample-api/group/service.go`                                         | GroupRepository interface に `ListNonGroupMembers` / `AddGroupMembers` 追加・UserRepository interface（`GetByID`）追加 |
| `sample-api/group/service_test.go`                                    | Service ユニットテスト（各メソッド）                                                                                   |
| `sample-api/group/mocks/group_repository_mock.go`                     | GroupRepository の手動 mock 更新                                                                                       |
| `sample-api/group/mocks/user_repository_mock.go`                      | UserRepository の手動 mock（group パッケージ用）                                                                       |
| `sample-api/internal/rest/group.go`                                   | HTTP Handler（`ListNonGroupMembers` / `AddGroupMembers`）・GroupService interface 追加                                 |
| `sample-api/internal/rest/group_test.go`                              | Handler ユニットテスト                                                                                                 |
| `sample-api/internal/rest/mocks/group_service_mock.go`                | GroupService の手動 mock 更新                                                                                          |
| `sample-api/internal/repository/mysql/group.go`                       | MySQL 実装（`ListNonGroupMembers` / `AddGroupMembers`）                                                                |
| `sample-api/internal/repository/mysql/user.go`                        | UserRepository 実装（`GetByID`）。group サービスの UserRepository IF を満たす                                          |
| `sample-api/db/migrate/20260411120000_add_search_key_to_users.up.sql` | `users` テーブルへの `search_key` VIRTUAL GENERATED COLUMN 追加マイグレーション                                        |

### sample-front

| ファイル                                                        | 役割                                                                                                                                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sample-front/src/pages/group-detail/api/fetch-non-members.ts`  | `GET /api/v1/groups/:id/non-members` 呼び出し                                                                                                                                                                       |
| `sample-front/src/pages/group-detail/api/add-group-members.ts`  | `POST /api/v1/groups/:id/members` 呼び出し                                                                                                                                                                          |
| `sample-front/src/pages/group-detail/model/useNonMemberList.ts` | `clearNonMemberListCache(groupId?: number)` のシグネチャ変更（引数追加）。指定時は `nonMemberListCache.delete(groupId)` で単一エントリのみクリア、未指定時は `nonMemberListCache.clear()` で全クリア                |
| `sample-front/src/pages/group-detail/ui/AddMemberSheet.tsx`     | マウント時 `useEffect` 追加・「一括追加」ボタンを検索フォームの直下（ユーザー一覧の上）に配置・`variant="soft"` / `radius="full"` / `size="2"` スタイル・右端揃え（`justifyContent: "flex-end"`）・下部ボタンを削除 |
| `sample-front/src/pages/group-detail/ui/GroupDetailContent.tsx` | 「メンバー追加」ボタン追加・AddMemberSheet の開閉状態管理                                                                                                                                                           |

---

## 最低要件

1. `users` テーブルに `search_key` VIRTUAL GENERATED COLUMN が追加されている（`CONCAT(first_name, last_name, last_name, first_name)`）
2. `GET /api/v1/groups/:id/non-members` が実装されており、未所属ユーザー一覧（id, first_name, last_name）と total を返す
3. `NOT IN` サブクエリで既存 group_members からグループ所属済みユーザーを除外している
4. `q` パラメータで `search_key LIKE '%q%'` の検索が動作する
5. `id` が整数でない / 0 以下の場合に 400 を返す
6. 対象グループが存在しない場合に 404 を返す
7. `POST /api/v1/groups/:id/members` が `{"user_ids": [...]}` を受け付け、全件 INSERT する
8. user_ids 内に既存メンバーが 1 人でもいる場合は全失敗で 409 を返す（ロールバック）
9. 追加成功時に 201 Created + 追加したメンバー一覧を返す
10. グループ詳細画面の MemberList ヘッダーに「メンバー追加」ボタンが表示される
11. ボタン押下で AddMemberSheet（シート形式）が表示される
12. シート内の構成（上から順）：検索入力 → 「一括追加」ボタン（検索フォーム直下・コンテンツ幅・右端揃え・soft スタイル・radius full・size 2）→ チェックボックス付きユーザー一覧。下部に「一括追加」ボタンは存在しない
13. 「一括追加」ボタンは選択ユーザーが 1 件以上かつ送信中でないときのみ活性化する
14. 追加成功後にシートを閉じ、MemberList と member_count（GroupDetail）を再取得する
15. 409 エラー時はシート内にエラーメッセージを表示する
16. `AddMemberSheet` がマウントされるたびに `clearNonMemberListCache(groupId)` を呼び出し、非メンバーリストのキャッシュをクリアする（他ユーザーの変更も反映される）
17. `clearNonMemberListCache` は `groupId?: number` を受け取り、指定時は該当グループのキャッシュのみクリアする

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- メンバーの削除
- ソート順の変更（固定: users.id ASC）
