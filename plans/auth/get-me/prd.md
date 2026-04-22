# PRD: get-me

## 概要

| 項目         | 内容                                             |
| ------------ | ------------------------------------------------ |
| 機能名       | `get-me`                                         |
| 目的         | 認証済みユーザー自身のプロフィール情報を取得する |
| API          | `GET /api/v1/me`                                 |
| 認証         | 必要                                             |
| データソース | MySQL（AuthMiddleware 経由で取得済み）           |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `GET /api/v1/me`

#### リクエスト仕様

リクエストパラメータなし。AuthMiddleware がコンテキストに authUser をセットする。

#### バリデーション一覧

| #   | 対象フィールド | ルール                     | エラー時の挙動   |
| --- | -------------- | -------------------------- | ---------------- |
| 1   | authUser       | コンテキストに存在すること | 401 Unauthorized |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `GET /api/v1/me`

凡例: → = 次の処理へ進む / 終了 = 処理終了 / 401 = 401 Unauthorized / 404 = 404 Not Found / 500 = 500 Internal Server Error

```
【起動時: 認証ミドルウェア初期化】
1. 開発環境の場合: 認証用ユーザー UUID を環境変数から取得する
   - 未設定 → 起動失敗 → 終了
2. 本番環境の場合: 未実装のため起動失敗（将来 ALB OIDC JWT 対応予定）→ 終了

【リクエスト処理: 認証ミドルウェア（各リクエストごと）】
3. 認証用 UUID でユーザーを DB から取得する
4. 取得失敗
   - ユーザーが存在しない → 404 { "message": "your requested item is not found" } → 終了
   - DB エラー → 500 { "message": "internal server error" } → 終了
5. 取得成功 → ユーザーをコンテキストにセットする → 次のハンドラへ進む

【Handler: GetMe】
6. コンテキストから認証ユーザーを取得する
7. 取得失敗 → 401 { "message": "Unauthorized" } → 終了
8. 取得成功 → 200 OK + ユーザー情報（id, uuid, first_name, last_name）を返す → 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### コンポーネント: `ProtectedRoute`

凡例: → = 次の処理へ進む / 終了 = 処理終了

```
1. ローディング状態で初期化する

2. GET /api/v1/me を送信する

3. レスポンス受信（成功）
   - ユーザー情報を認証コンテキストにセットする（snake_case から camelCase にマッピング）
   - 認証済み状態に更新する

4. レスポンス受信（エラー）
   - 401 → 未認証状態に更新する
   - その他（ネットワークエラー・5xx 等）→ API 利用不可状態に更新する

5. ローディング中 → 画面を非表示にする → 終了
6. 未認証状態 → /service-unavailable へリダイレクトする（reason: "unauthenticated"）→ 終了
7. API 利用不可状態 → /service-unavailable へリダイレクトする（reason: "api_unavailable"）→ 終了
8. 認証済み状態 → children を表示する → 終了
```

---

## 確認ステップ 5-3: ファイル配置

### sample-api

| ファイル                                                        | 役割                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| `sample-api/domain/user.go`                                     | User Entity 定義（ID: uint64）                              |
| `sample-api/domain/errors.go`                                   | センチネルエラー定義                                        |
| `sample-api/auth/service.go`                                    | 認証ユーザー取得のビジネスロジック                          |
| `sample-api/auth/service_test.go`                               | Service ユニットテスト                                      |
| `sample-api/auth/mocks/user_repository_mock.go`                 | UserRepository モック                                       |
| `sample-api/internal/repository/mysql/user.go`                  | ユーザー UUID 検索の DB 実装                                |
| `sample-api/internal/rest/auth.go`                              | HTTP Handler・AuthMiddleware                                |
| `sample-api/internal/rest/auth_test.go`                         | Handler ユニットテスト                                      |
| `sample-api/internal/rest/mocks/auth_service_mock.go`           | AuthService モック                                          |
| `sample-api/db/migrate/20260415120000_add_uuid_to_users.up.sql` | `users.uuid` カラム追加・マイグレーション（golang-migrate） |

### sample-front

| ファイル                                                        | 役割                                |
| --------------------------------------------------------------- | ----------------------------------- |
| `sample-front/src/app/routes/ProtectedRoute.tsx`                | GET /api/v1/me 呼び出し・認証ガード |
| `sample-front/src/app/routes/__tests__/ProtectedRoute.test.tsx` | ProtectedRoute ユニットテスト       |
| `sample-front/src/shared/auth/auth.tsx`                         | AuthContext・useAuth・AuthProvider  |
| `sample-front/src/shared/auth/index.ts`                         | auth barrel export                  |
| `sample-front/src/shared/api/client.ts`                         | apiFetch・HttpError 定義            |
| `sample-front/src/shared/api/index.ts`                          | shared/api barrel export            |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `GET /api/v1/me`

### レスポンス（正常系）

- ステータス: `200 OK`

```json
{
  "id": 1,
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "first_name": "太郎",
  "last_name": "山田"
}
```

> BE 側の `id` フィールドは `uint64` 型（`domain.User.ID uint64`）。FE 側（`AuthUser`）は `number` 型として受け取る。

### エラーケース一覧

| 条件                                                    | 発生レイヤー            | ステータス                | レスポンス                                                       |
| ------------------------------------------------------- | ----------------------- | ------------------------- | ---------------------------------------------------------------- |
| authUser が未セット（型アサーション失敗）               | Handler                 | 401 Unauthorized          | `{ "message": "Unauthorized" }`                                  |
| DEV_USER_UUID のユーザーが存在しない                    | Middleware → Repository | 404 Not Found             | `{ "message": "your requested item is not found" }`              |
| DB エラー（GetByUUID 失敗）                             | Middleware → Repository | 500 Internal Server Error | `{ "message": "internal server error" }`                         |
| GET /api/v1/me が 401 を返した（FE）                    | ProtectedRoute          | —                         | /service-unavailable へリダイレクト（reason: "unauthenticated"） |
| GET /api/v1/me がネットワークエラー・その他エラー（FE） | ProtectedRoute          | —                         | /service-unavailable へリダイレクト（reason: "api_unavailable"） |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `GET /api/v1/me`

#### BE: `sample-api/internal/rest/auth_test.go`

| #   | テスト関数                                       | 観点                                    | 入力                                    | 期待結果                                                     |
| --- | ------------------------------------------------ | --------------------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| 1   | `TestAuthMiddleware_Development_ValidUUID`       | AuthMiddleware 正常系                   | DEV_USER_UUID が存在するユーザーの UUID | authUser がコンテキストにセットされ 200 OK                   |
| 2   | `TestAuthMiddleware_Development_NonexistentUUID` | AuthMiddleware 異常系（ユーザー未存在） | DEV_USER_UUID が存在しない UUID         | 404 Not Found                                                |
| 3   | `TestAuthHandler_GetMe_OK`                       | GetMe 正常系                            | 有効な authUser をコンテキストにセット  | 200 OK + domain.User JSON（ID/UUID/FirstName/LastName 一致） |
| 4   | `TestAuthHandler_GetMe_NoAuthUser`               | GetMe 異常系（authUser 未セット）       | コンテキストに authUser なし            | 401 Unauthorized + `{ "message": "Unauthorized" }`           |

#### BE: `sample-api/auth/service_test.go`

| #   | テスト関数                       | 観点                             | 入力            | 期待結果                    |
| --- | -------------------------------- | -------------------------------- | --------------- | --------------------------- |
| 5   | `TestService_GetByUUID_Success`  | Service 正常系                   | 存在する UUID   | domain.User を返す          |
| 6   | `TestService_GetByUUID_NotFound` | Service 異常系（ユーザー未存在） | 存在しない UUID | `domain.ErrNotFound` を返す |

#### FE: `sample-front/src/app/routes/__tests__/ProtectedRoute.test.tsx`

| #   | テスト内容                                                                                                        | 入力                                       | 期待結果                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| 7   | GET /api/v1/me が 200 を返すとユーザー情報が setUser に渡される（firstName/lastName マッピング確認）              | MeResponse（id/uuid/first_name/last_name） | setUser に camelCase でマッピングされた値が渡り、children が表示される |
| 8   | GET /api/v1/me が 401 を返すと reason='unauthenticated' で /service-unavailable へリダイレクトされる              | HttpError(401)                             | /service-unavailable へリダイレクト（reason: "unauthenticated"）       |
| 9   | GET /api/v1/me がネットワークエラーを返すと reason='api_unavailable' で /service-unavailable へリダイレクトされる | Error("Network Error")                     | /service-unavailable へリダイレクト（reason: "api_unavailable"）       |

---

## 要件

1. 認証済みユーザー自身のプロフィールを取得できる
2. AuthMiddleware が DB からユーザーを取得してコンテキストにセットする（development 環境では DEV_USER_UUID を使用）
3. ProtectedRoute が GET /api/v1/me を呼び出し、成功時はユーザー情報を AuthContext にセットして children を表示する
4. 401 の場合は /service-unavailable へリダイレクトする（reason: "unauthenticated"）
5. ネットワークエラー等の場合は /service-unavailable へリダイレクトする（reason: "api_unavailable"）

---

## 対象外

- ログイン / ログアウト処理（現実装では ALB OIDC JWT 検証は未実装）
- パスワード変更
