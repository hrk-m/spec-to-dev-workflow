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

### UI インタラクション仕様（ヘッダーチェックボックス）

#### クリック動作

| 現在の選択状態            | クリック後 |
| ------------------------- | ---------- |
| 全未選択                  | 全選択     |
| indeterminate（一部選択） | 全選択     |
| 全選択                    | 全解除     |

#### 表示状態派生

| 条件                             | ヘッダー checkbox の状態 |
| -------------------------------- | ------------------------ |
| 非メンバー 0 件                  | disabled                 |
| 非メンバー 1 件以上 かつ 未選択  | 未チェック               |
| 0 < 選択数 < 全体数              | indeterminate            |
| 選択数 = 全体数（かつ 1 件以上） | チェック済み             |

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

3. ユーザーがチェックボックスまたは行をクリックする
   a. ヘッダーチェックボックス（全選択）をクリックする
      - 全未選択または一部選択（indeterminate）の場合 → 全非メンバーを選択する
      - 全件選択済みの場合 → 全選択を解除する
      - 非メンバーが 0 件の場合は disabled（操作不可）
   b. 個別チェックボックスまたは行をクリックする → 選択状態を切り替える
      - 一部のみ選択されている場合、ヘッダーチェックボックスは indeterminate になる

4. 「一括追加」ボタンをクリックする（未選択または送信中は非活性）
   - 未選択の場合 → 何もしない → 終了
   - 選択あり → ローディング状態を開始する

5. POST /api/v1/groups/:id/members { user_ids: [...] } を送信する

6. レスポンス受信
   - 成功（201 Created）→ メンバーリストキャッシュをクリアする → グループ詳細を再取得する → シートを閉じる（選択状態リセット）→ 終了
   - 失敗（409）→ 「選択したユーザーはすでにメンバーです」エラーメッセージを表示する（選択状態は維持）→ 終了
   - 失敗（その他）→ エラーメッセージを表示する（選択状態は維持）→ 終了

7. ローディング状態を終了する → 終了
```

### ヘッダーチェックボックスの内部実装フロー

```
1. AddMemberSheet がマウントされる
2. 非メンバー一覧と選択済み ID 一覧から以下の状態を派生する
   - 全選択状態（isAllSelected）: users.length > 0 && selectedIds.size === users.length
   - 一部選択状態（isSomeSelected）: selectedIds.size > 0 && selectedIds.size < users.length
   - ヘッダー checkbox の操作可否（非メンバーが 0 件なら disabled）
3. 副作用フックでヘッダー checkbox の indeterminate 状態を DOM に反映する
   - 全選択状態・一部選択状態が変化するたびに再実行する
4. ユーザーがヘッダー checkbox をクリックする
   - 全選択状態の場合 → 選択状態を全解除する → 終了
   - 全選択状態でない場合（全未選択 or 一部選択）→ 全非メンバーを選択状態にする → 終了
5. 選択状態が変わるたびに副作用フックが再実行され indeterminate が再設定される
6. 一括追加成功後は onClose() でシートが閉じ、選択状態が自動リセットされる → 終了
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

| 対応ステップ | パス                                                            | 役割                                                                                                                       |
| ------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 5-2-FE       | `sample-front/src/pages/group-detail/api/add-group-members.ts`  | API クライアント（POST /api/v1/groups/:id/members）                                                                        |
| 5-2-FE       | `sample-front/src/pages/group-detail/model/useNonMemberList.ts` | 非メンバー一覧取得・無限スクロールカスタムフック                                                                           |
| 5-2-FE       | `sample-front/src/pages/group-detail/ui/AddMemberSheet.tsx`     | 非メンバー追加シート（ヘッダー checkbox 追加・全選択ロジック・indeterminate DOM 反映の副作用フック・一括追加・エラー処理） |

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

### エラーケース一覧（バックエンド）

| 条件                 | 発生レイヤー | ステータス                | レスポンス                                          |
| -------------------- | ------------ | ------------------------- | --------------------------------------------------- |
| id が不正            | Handler      | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| user_ids が空        | Handler      | 400 Bad Request           | `{ "message": "given param is not valid" }`         |
| グループ未存在       | Service      | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| ユーザーが存在しない | Service      | 404 Not Found             | `{ "message": "your requested item is not found" }` |
| 既にメンバー         | Repository   | 409 Conflict              | `{ "message": "your item already exist" }`          |
| 未認証               | Middleware   | 401 Unauthorized          | `{ "message": "Unauthorized" }`                     |
| DB エラー            | Repository   | 500 Internal Server Error | `{ "message": "internal server error" }`            |

### エッジケース一覧（フロントエンド）

| 条件                                   | 発生箇所       | 挙動                                                                 |
| -------------------------------------- | -------------- | -------------------------------------------------------------------- |
| 非メンバー 0 件                        | AddMemberSheet | ヘッダー checkbox を disabled にして操作不可にする                   |
| 全選択状態でヘッダー checkbox クリック | AddMemberSheet | 全解除（選択状態を全てリセット）                                     |
| indeterminate 状態でクリック           | AddMemberSheet | 全選択（全非メンバーを選択状態にする）                               |
| 一括追加 API 成功後                    | 一括追加処理   | onClose() でシートが閉じて選択状態がリセットされる                   |
| 一括追加 API 失敗                      | AddMemberSheet | 既存エラーハンドリングと同じ（エラーメッセージ表示）、選択状態は維持 |

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

**FE コンポーネントテスト** (`sample-front/src/pages/group-detail/ui/__tests__/AddMemberSheet.test.tsx`):

| #   | 観点   | テスト内容                                               | 期待結果                               |
| --- | ------ | -------------------------------------------------------- | -------------------------------------- |
| 1   | 全選択 | 全未選択時にヘッダー checkbox が unchecked               | checked=false かつ indeterminate=false |
| 2   | 全選択 | 全非メンバー個別選択後にヘッダー checkbox が checked     | checked=true かつ indeterminate=false  |
| 3   | 全選択 | 一部選択時にヘッダー checkbox が indeterminate=true      | indeterminate=true                     |
| 4   | 全選択 | 全未選択→ヘッダークリックで全非メンバーが選択される      | 全行 aria-checked="true"               |
| 5   | 全選択 | 全選択→ヘッダークリックで全非メンバーが解除される        | 全行 aria-checked="false"              |
| 6   | 全選択 | indeterminate→ヘッダークリックで全非メンバーが選択される | 全行 aria-checked="true"               |
| 7   | 境界値 | 非メンバー 0 件時にヘッダー checkbox が disabled=true    | disabled=true                          |

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
5. AddMemberSheet テーブルヘッダー左端に「全選択」チェックボックスを追加する
6. 全未選択時にクリックすると表示中の全行を選択する
7. indeterminate（一部選択）時にクリックすると全行を選択する
8. 全選択時にクリックすると全行を選択解除する
9. ヘッダー checkbox の DOM を useRef で所持し、useEffect で indeterminate 属性を直接設定する
10. 非メンバー 0 件のときヘッダー checkbox を disabled にする
11. 一括追加成功後は onClose() によりシートが閉じて選択状態がリセットされる（明示リセット不要）

---

## 対象外

- メンバーの削除（→ delete-group-members）
- 追加後のメンバー一覧取得（→ list-group-members）
