# PRD: remove-group-members

## 概要

| 項目         | 内容                                                                              |
| ------------ | --------------------------------------------------------------------------------- |
| 機能名       | `remove-group-members`                                                            |
| 目的         | グループ詳細画面のメンバー一覧から、1 件または複数件のメンバーを一括で削除できるようにする |
| API          | `DELETE /api/v1/groups/:id/members`（メンバー一括削除）                           |
| 認証         | 必要（AuthMiddleware）                                                            |
| データソース | MySQL (`sample-api/internal/repository/mysql`)                                    |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `DELETE /api/v1/groups/:id/members`

#### リクエスト仕様

| フィールド | 型             | 必須 | 説明                                       |
| ---------- | -------------- | ---- | ------------------------------------------ |
| `id`       | integer (path) | ✓    | グループの ID。正の整数                    |
| `user_ids` | array (body)   | ✓    | 削除するユーザー ID の配列。1 件以上       |

#### バリデーション一覧

| #   | 対象フィールド | ルール                                            | エラー時の挙動  |
| --- | -------------- | ------------------------------------------------- | --------------- |
| 1   | `id`           | 整数に変換できること                              | 400 Bad Request |
| 2   | `id`           | 1 以上（正の整数）であること                      | 400 Bad Request |
| 3   | `id`           | DB 上に該当グループが存在すること                 | 404 Not Found   |
| 4   | `user_ids`     | リクエストボディに含まれること                    | 400 Bad Request |
| 5   | `user_ids`     | 空配列でないこと（1 件以上）                      | 400 Bad Request |
| 6   | `user_ids`     | 各 user_id がグループメンバーであること           | 404 Not Found   |

---

## 確認ステップ 5-2: 処理フロー

### エンドポイント: `DELETE /api/v1/groups/:id/members`

#### フロントエンド 処理フロー

```
1. 開始
2. MemberList の各行にチェックボックスを表示
3. ユーザーが 1 件以上チェックを入れる
4. 「削除」ボタンが有効化される（0 件の場合は disabled）
5. ユーザーが「削除」ボタンをクリック
6. 確認ダイアログを表示（「選択した N 名をグループから削除しますか？」）
7. ユーザーがダイアログを確認
   - キャンセル → ダイアログを閉じて終了
8. DELETE /api/v1/groups/:id/members { "user_ids": [...] } を送信
9. レスポンスは成功？
   - Yes（204）→
      10. チェック状態をリセット
      11. clearMemberListCache() を呼び出してメンバー一覧キャッシュをクリア
      12. useGroupDetail.refetch() を呼び出してグループ詳細（member_count）を更新
      13. 終了
   - No（4xx・5xx）→
      10. エラーメッセージを表示
      11. 終了
```

#### バックエンド 処理フロー

```
1. 開始
2. クライアントから HTTP リクエスト（DELETE /api/v1/groups/:id/members）を受信
3. パスパラメータ id を取得し整数にパース
   - パース失敗 / 1 未満 の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
4. リクエストボディを Bind して user_ids を取得
   - Bind 失敗 / user_ids が空の場合
      - 400 Bad Request { "message": "given param is not valid" } を返す
      - 終了
5. Service.RemoveGroupMembers(ctx, groupID, userIDs) を呼び出す
6. Repository.GetByID(ctx, groupID) でグループ存在確認
   - 存在しない（ErrNotFound）→
      - 404 Not Found { "message": "your requested item is not found" } を返す
      - 終了
7. deduplicateUint64 で重複 ID を除去したのち、group_members に対して COUNT クエリで全 user_id のメンバー存在確認
   - 期待カウントと実際のカウントが一致しない（非メンバーが 1 件以上）→
      - 404 Not Found { "message": "your requested item is not found" } を返す
      - 終了
8. トランザクションを開始し、DELETE FROM group_members WHERE group_id = :group_id AND user_id IN (:user_ids) を実行
   - DB エラーの場合 → ロールバックして 500 Internal Server Error を返す
9. トランザクションをコミット
10. 200 OK（ボディなし）を返す
11. 終了
```

---

## 確認ステップ 5-3: DB 操作

DB スキーマ変更なし（既存テーブルへの DELETE 操作のみ）。

### DB 操作

| 項目     | 内容                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------- |
| 対象テーブル | `group_members`                                                                               |
| SQL      | `DELETE FROM group_members WHERE group_id = :group_id AND user_id IN (:user_ids)`                |
| トランザクション | あり                                                                                      |
| スキーマ変更 | なし                                                                                          |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `DELETE /api/v1/groups/:id/members`

#### レスポンス（正常系）

- ステータス: `204 No Content`
- ボディ: なし

#### エラーケース一覧

| 条件                                             | 発生レイヤー                       | ステータス                | レスポンス                                          |
| ------------------------------------------------ | ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `id` が整数に変換不可                            | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `id` が 1 未満                                   | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| `user_ids` が存在しない / 空配列                 | Handler                            | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| 対象グループが存在しない                         | Service / Repository               | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| `user_ids` 内にグループメンバーでない user_id がある | Service / Repository           | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| DB エラー                                        | Repository                         | 500 Internal Server Error | `{ "message": "internal server error" }`            |
| ネットワークエラー                               | フロントエンド: API クライアント層 | —                         | エラーメッセージ表示                                |

---

## 確認ステップ 5-5: ユニットテストケース

### バックエンド

| #   | 観点     | テスト内容                                     | 入力例                             | 期待結果                        |
| --- | -------- | ---------------------------------------------- | ---------------------------------- | ------------------------------- |
| 1   | 正常系   | 1 件のメンバーを削除                           | `id=1, user_ids=[2]`               | 204 No Content                  |
| 2   | 正常系   | 複数件のメンバーを一括削除                     | `id=1, user_ids=[2,3,4]`           | 204 No Content                  |
| 3   | 異常系   | `id` が整数でない                              | `id="abc"`                         | 400 Bad Request                 |
| 4   | 異常系   | `id` が 0 以下                                 | `id=0`                             | 400 Bad Request                 |
| 5   | 異常系   | `user_ids` が空配列                            | `id=1, user_ids=[]`                | 400 Bad Request                 |
| 6   | 異常系   | 存在しないグループ ID                          | `id=9999, user_ids=[1]`            | 404 Not Found                   |
| 7   | 異常系   | グループメンバーでない user_id を含む          | `id=1, user_ids=[999]`（非メンバー）| 404 Not Found                  |
| 8   | 境界値   | `user_ids` に 1 件だけ指定                     | `id=1, user_ids=[1]`               | 204 No Content                  |
| 9   | 例外処理 | DB エラー発生時                                | DB 障害をモック                    | 500 Internal Server Error       |
| 10  | 外部依存 | Service をモックで切り分け                     | mockGroupService                   | Handler 単体でテスト可能        |
| 11  | 外部依存 | Repository をモックで切り分け                  | mockGroupRepository                | Service 単体でテスト可能        |
| 12  | 状態変化 | DELETE 後に group_members から行が消えている   | `id=1, user_ids=[2]`               | DB から該当行が削除             |

### フロントエンド

| #   | 観点   | テスト内容                                          | 期待結果                                                     |
| --- | ------ | --------------------------------------------------- | ------------------------------------------------------------ |
| 1   | 正常系 | チェックで削除ボタンが有効化される                  | 未チェック時: disabled、1 件以上: enabled                    |
| 2   | 正常系 | 削除ボタン押下で確認ダイアログが開く                | ダイアログが表示される                                       |
| 3   | 正常系 | 削除成功後にキャッシュクリアと再取得が呼ばれる      | `clearMemberListCache`・`refetch` が呼ばれる                 |
| 4   | 正常系 | キャンセルでダイアログを閉じてリストは変化しない    | ダイアログが閉じ、チェック状態が維持される                   |
| 5   | 異常系 | 4xx/5xx エラー時にエラーメッセージを表示            | エラーメッセージが描画される                                 |

---

## ファイル配置

### sample-api

| ファイル                                                        | 役割                                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `sample-api/group/service.go`                                   | `GroupRepository` interface に `RemoveGroupMembers` を追加、Service 実装         |
| `sample-api/group/service_test.go`                              | `RemoveGroupMembers` のユニットテスト追加                                        |
| `sample-api/group/mocks/group_repository_mock.go`               | `RemoveGroupMembers` メソッドを手動 mock に追加                                  |
| `sample-api/internal/rest/group.go`                             | `DELETE /api/v1/groups/:id/members` ハンドラ追加・`GroupService` interface 更新 |
| `sample-api/internal/rest/group_test.go`                        | ハンドラユニットテスト追加                                                       |
| `sample-api/internal/rest/mocks/group_service_mock.go`          | `RemoveGroupMembers` メソッドを手動 mock に追加                                  |
| `sample-api/internal/repository/mysql/group.go`                 | `RemoveGroupMembers` MySQL 実装追加                                              |

### sample-front

| ファイル                                                                   | 役割                                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `sample-front/src/pages/group-detail/api/delete-group-members.ts`          | `DELETE /api/v1/groups/:id/members` 呼び出し                                  |
| `sample-front/src/pages/group-detail/ui/MemberList.tsx`                    | 各行にチェックボックス追加・削除ボタン・確認ダイアログ追加                    |

---

## 最低要件

1. `DELETE /api/v1/groups/:id/members` エンドポイントが実装されており、ボディに `user_ids` 配列を受け付ける
2. `id` が整数でない / 0 以下の場合に 400 Bad Request を返す
3. `user_ids` が存在しない / 空配列の場合に 400 Bad Request を返す
4. 対象グループが存在しない場合に 404 Not Found を返す
5. `user_ids` 内にグループメンバーでない `user_id` が 1 件でもある場合に 404 Not Found を返す（全失敗）
6. バリデーション通過後、トランザクション内で `group_members` から対象行を一括 DELETE する
7. 削除成功時に 200 OK（ボディなし）を返す
8. DB エラー発生時にロールバックして 500 Internal Server Error を返す
9. `MemberList` の各行にチェックボックスが表示される
10. 1 件以上チェックされている場合のみ「削除」ボタンが有効化される（0 件の場合は disabled）
11. 「削除」ボタン押下で確認ダイアログが表示される（「選択した N 名をグループから削除しますか？」）
12. 削除成功後にチェック状態をリセットし、`clearMemberListCache()` と `useGroupDetail.refetch()` を呼び出す
13. エラー時にエラーメッセージを表示する

---

## 対象外

- 認証・認可（このエンドポイントは認証不要）
- メンバーの追加・編集
- ソート順の変更
