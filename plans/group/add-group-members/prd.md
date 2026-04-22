# PRD: add-group-members

## 概要

| 項目         | 内容                                           |
| ------------ | ---------------------------------------------- |
| 機能名       | `add-group-members`                            |
| 目的         | グループに複数ユーザーを一括追加する           |
| API          | `POST /api/v1/groups/:id/members`              |
| 認証         | 必要                                           |
| データソース | MySQL (`sample-api/internal/repository/mysql`) |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `POST /api/v1/groups/:id/members`

#### リクエスト仕様

| フィールド | 型              | 必須 | 説明                                  |
| ---------- | --------------- | ---- | ------------------------------------- |
| `id`       | uint64 (path)   | ✓    | グループ ID                           |
| `user_ids` | []uint64 (body) | ✓    | 追加するユーザー ID リスト（1件以上） |

#### バリデーション一覧

| #   | 対象フィールド   | ルール                            | エラー時の挙動  |
| --- | ---------------- | --------------------------------- | --------------- |
| 0   | リクエストボディ | JSON デコードに成功すること       | 400 Bad Request |
| 1   | `id`             | 正の整数であること                | 400 Bad Request |
| 2   | `id`             | DB 上にグループが存在すること     | 404 Not Found   |
| 3   | `user_ids`       | 1件以上であること                 | 400 Bad Request |
| 4   | `user_ids`       | 全ユーザーが DB に存在すること    | 404 Not Found   |
| 5   | `user_ids`       | 重複 ID は自動排除（サービス層）  | -               |
| 6   | `user_ids`       | 既にメンバーの場合は 409 Conflict | 409 Conflict    |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `POST /api/v1/groups/:id/members`

凡例: `→` は条件分岐・次ステップ、`終了` はフロー終端を示す

#### バックエンド処理フロー

```
1. 認証ミドルウェアが認証済みユーザーをコンテキストにセットする
   - ユーザー取得失敗 → 認証エラーに対応するステータスを返す → 終了

2. パスパラメータ id を正の整数として取得する
   - 非数値・0・負数 → 400 Bad Request { "message": "given param is not valid" } → 終了

3. リクエストボディを JSON としてデコードする
   - デコード失敗 → 400 Bad Request → 終了

4. user_ids が空である場合
   - Yes → 400 Bad Request { "message": "given param is not valid" } → 終了
   - No → 続行

5. メンバー追加をサービス層に委譲する

6. user_ids の重複を排除する

7. グループの存在を確認する
   - 存在しない → 404 Not Found { "message": "your requested item is not found" } → 終了

8. 指定ユーザー全員の存在を一括件数確認する
   - DB エラー → 500 Internal Server Error { "message": "internal server error" } → 終了
   - 件数が一致しない（一部または全員が存在しない）→ 404 Not Found { "message": "your requested item is not found" } → 終了

9. 既存メンバーの重複チェックを行う
   - 既存メンバーが 1 件以上含まれる → 409 Conflict { "message": "your item already exist" } → 終了
   - DB エラー → 500 Internal Server Error → 終了

10. トランザクションを開始してメンバーを登録する
    - 開始失敗 → 500 Internal Server Error → 終了

11. 全ユーザーをグループメンバーとして登録する
    - 一意制約違反 → ロールバック → 409 Conflict { "message": "your item already exist" } → 終了
    - その他 DB エラー → ロールバック → 500 Internal Server Error → 終了

12. トランザクションをコミットする
    - コミット失敗 → ロールバック → 500 Internal Server Error → 終了

13. 追加したユーザー情報を取得する
    - DB エラー → 500 Internal Server Error → 終了

14. 201 Created + 追加メンバー一覧（id, first_name, last_name）を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

凡例: `→` = 次の処理へ進む / 終了 = 処理終了

```
1. マウント時にキャッシュをクリアする

2. 非メンバー一覧をテーブル形式（選択/姓名列）で表示する

3. ユーザーがチェックボックスまたは行をクリックする → 選択状態を更新する → 終了

4. 「一括追加」ボタンをクリックする（未選択または送信中は非活性）
   - 未選択の場合 → 何もしない → 終了
   - 選択あり → ローディング状態を開始する

5. POST /api/v1/groups/:id/members { user_ids: [...] } を送信する

6. レスポンス受信
   - 成功（201 Created）→ メンバーリストキャッシュをクリアする → グループ詳細を再取得する → シートを閉じる → 終了
   - 失敗（409）→ 「選択したユーザーはすでにメンバーです」エラーメッセージを表示する → 終了
   - 失敗（その他）→ エラーメッセージを表示する → 終了

7. ローディング状態を終了する → 終了
```

---

## 確認ステップ 5-3: ファイル配置

### sample-api

| 対応ステップ  | パス                                                        | 役割                                                                                |
| ------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 5-2           | `sample-api/domain/user.go`                                 | User Entity（id, first_name, last_name）定義                                        |
| 5-2           | `sample-api/group/service.go`                               | グループメンバー追加のビジネスロジック（重複排除・存在確認・DB 操作）               |
| 5-5           | `sample-api/group/service_test.go`                          | AddGroupMembers の Service ユニットテスト                                           |
| 5-5           | `sample-api/group/mocks/group_repository_mock.go`           | GroupRepository の手動 mock                                                         |
| 5-1, 5-2, 5-4 | `sample-api/internal/rest/group.go`                         | HTTP Handler・GroupService interface・ルート登録（POST /api/v1/groups/:id/members） |
| 5-5           | `sample-api/internal/rest/group_test.go`                    | Handler ユニットテスト                                                              |
| 5-5           | `sample-api/internal/rest/mocks/group_service_mock.go`      | GroupService の手動 mock                                                            |
| 5-3           | `sample-api/internal/repository/mysql/group.go`             | MySQL 実装（重複チェック・トランザクション・メンバー追加）                          |
| 5-3           | `sample-api/db/migrate/20260403120000_create_tables.up.sql` | `group_members` テーブル定義・マイグレーション（golang-migrate）                    |

### sample-front

| 対応ステップ | パス                                                            | 役割                                                |
| ------------ | --------------------------------------------------------------- | --------------------------------------------------- |
| 5-2-FE       | `sample-front/src/pages/group-detail/api/add-group-members.ts`  | API クライアント（POST /api/v1/groups/:id/members） |
| 5-2-FE       | `sample-front/src/pages/group-detail/model/useNonMemberList.ts` | 非メンバー一覧取得・無限スクロールカスタムフック    |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/AddMemberSheet.tsx`     | 非メンバー追加シート（選択・一括追加・エラー処理）  |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `POST /api/v1/groups/:id/members`

### レスポンス（正常系）

- ステータス: `201 Created`

```json
{
  "members": [
    {
      "id": 2,
      "first_name": "花子",
      "last_name": "鈴木"
    }
  ]
}
```

### エラーケース一覧

| 条件                 | 発生レイヤー | ステータス                | レスポンス                                          |
| -------------------- | ------------ | ------------------------- | --------------------------------------------------- |
| id が不正            | Handler      | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| user_ids が空        | Handler      | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| グループ未存在       | Service      | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| ユーザーが存在しない | Service      | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| 既にメンバー         | Repository   | 409 Conflict              | `{ "message": "your item already exist" }`          |
| 未認証               | Middleware   | 401 Unauthorized          | `{ "message": "Unauthorized" }`                     |
| DB エラー            | Repository   | 500 Internal Server Error | `{ "message": "internal server error" }`            |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `POST /api/v1/groups/:id/members`

**Handler テスト** (`internal/rest/group_test.go`):

| #   | 観点     | テスト内容           | 入力例          | 期待結果                  |
| --- | -------- | -------------------- | --------------- | ------------------------- |
| 1   | 正常系   | 複数ユーザー一括追加 | user_ids=[2,3]  | 201 Created + members     |
| 2   | 異常系   | id が文字列          | id=abc          | 400 Bad Request           |
| 3   | 境界値   | id=0                 | id=0            | 400 Bad Request           |
| 4   | 異常系   | user_ids が空        | user_ids=[]     | 400 Bad Request           |
| 5   | 異常系   | グループ未存在       | id=9999         | 404 Not Found             |
| 6   | 異常系   | 既にメンバー         | 既存メンバー ID | 409 Conflict              |
| 7   | 例外処理 | DB エラー時に 500    | DB モックエラー | 500 Internal Server Error |

**Service テスト** (`group/service_test.go`):

| #   | 観点     | テスト内容                        | 入力例                | 期待結果               |
| --- | -------- | --------------------------------- | --------------------- | ---------------------- |
| 8   | 正常系   | 複数ユーザー一括追加              | user_ids=[2,3]        | 追加メンバー一覧       |
| 9   | 異常系   | グループ未存在                    | groupID=9999          | ErrNotFound            |
| 10  | 異常系   | ユーザーが存在しない              | user_ids=[9999]       | ErrNotFound            |
| 11  | 異常系   | 既にメンバー（Repository が返す） | 既存メンバー ID       | ErrConflict            |
| 12  | 例外処理 | CountByIDs がエラーを返す         | userRepo モックエラー | ErrInternalServerError |
| 13  | 例外処理 | Repository がエラーを返す         | repo モックエラー     | ErrInternalServerError |
| 14  | 正常系   | 重複 ID は自動排除される          | user_ids=[2,2]        | 排除後 1 件で追加      |

---

## 要件

1. グループに複数ユーザーを一括追加できる
2. 重複 ID はサービス層で自動排除する
3. 全ユーザーの存在チェックを一括 COUNT クエリで行う
4. 既存メンバーが含まれる場合は 409 を返す（トランザクション）

---

## 対象外

- メンバーの削除（→ delete-group-members）
- 追加後のメンバー一覧取得（→ list-group-members）
