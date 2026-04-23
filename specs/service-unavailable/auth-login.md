# auth-login — 環境別認証基盤

## 概要

アプリ起動時に `GET /api/v1/me` を呼び出し、バックエンドが返す結果でページ表示を制御する認証基盤。開発環境では `DEV_USER_UUID` で指定したユーザーを自動ログイン済みとして扱う。API が応答しない場合はメンテナンス画面へ誘導する。

---

## 処理フロー（正常系）

```
アプリ起動
  │
  ├─ ProtectedRoute が GET /api/v1/me を実行
  │    └─ 200 返却
  │         ├─ AuthContext にユーザー情報（id, uuid, firstName, lastName）を保持
  │         └─ children（要求されたページ）を描画

/service-unavailable を直接開く（API 正常時）
  │
  ├─ ServiceUnavailablePage がマウント時に GET /api/v1/me を実行
  │    └─ 200 返却
  │         └─ / へ自動リダイレクト（API 復旧済み）
```

---

## 処理フロー（異常系）

```
ProtectedRoute で GET /api/v1/me が失敗
  ├─ 401 Unauthorized → /service-unavailable へリダイレクト（reason: unauthenticated）
  └─ ネットワークエラー等 → /service-unavailable へリダイレクト（reason: api_unavailable）

ServiceUnavailablePage でも GET /api/v1/me が失敗
  └─ 「ただいまメンテナンス中です。」画面を表示
```

---

## 使用コンポーネント・状態

| 要素                       | 種別                                           | 役割                                                                                                  |
| -------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `ProtectedRoute`           | コンポーネント（`app/routes/`）                | `GET /api/v1/me` を呼び出し、成功時は children を描画。失敗時は `/service-unavailable` へリダイレクト |
| `ServiceUnavailablePage`   | コンポーネント（`pages/service-unavailable/`） | マウント時に `GET /api/v1/me` を確認。200 なら `/` へリダイレクト。エラーならメンテナンス画面を表示   |
| `AuthProvider` / `useAuth` | Context Provider / Hook（`shared/auth/`）      | 認証済みユーザー情報（`AuthUser`）をアプリ全体に提供する                                              |
| `HttpError`                | クラス（`shared/api/client.ts`）               | HTTP エラーステータスを保持する `Error` サブクラス。`err.status === 401` で認証エラーを判別           |
| `status`                   | state（`ProtectedRoute` 内）                   | `"loading"` / `"authenticated"` / `"unauthenticated"` / `"api_unavailable"` の 4 状態                 |
| `status`                   | state（`ServiceUnavailablePage` 内）           | `"loading"` / `"redirect"` / `"error"` の 3 状態                                                      |

---

## 確認観点

```
- [ ] APP_ENV=development + DEV_USER_UUID 設定済みの状態で / にアクセスすると、ProtectedRoute を通過してコンテンツが表示される
- [ ] /service-unavailable を直接開くと API 正常時に / へリダイレクトされる
- [ ] GET /api/v1/me が 401 / 503 等のエラーを返すとき、/ へのアクセスが /service-unavailable へリダイレクトされる
- [ ] /service-unavailable で API が引き続き失敗するとき、「ただいまメンテナンス中です。」が表示される
- [ ] ローディング中は null が返り、画面のチラつきがない
- [ ] AuthContext に保持されたユーザー情報が useAuth で取得できる
```

---

## 使用 API

| エンドポイント | メソッド | 用途                                                              |
| -------------- | -------- | ----------------------------------------------------------------- |
| `/api/v1/me`   | GET      | 認証済みユーザー情報（id, uuid, first_name, last_name）を取得する |

---

## 対応する API 仕様

→ `plans/auth/get-me/prd.md`
