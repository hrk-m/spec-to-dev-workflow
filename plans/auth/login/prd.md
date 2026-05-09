# PRD: auth/login — 環境別認証基盤

## 概要

アプリ起動時に `GET /api/v1/me` を呼び出し、バックエンドが `APP_ENV` に応じてユーザーを返す認証基盤を構築する。

- **開発環境 (`APP_ENV=development`)**: `.env` の `DEV_USER_UUID` で指定したユーザーを返す（ログイン操作不要）
- **本番環境 (`APP_ENV≠development`)**: 401 を返す（将来の認証実装の TODO）
- フロントエンドは認証ロジックを持たず、`GET /api/v1/me` のレスポンスのみで表示を制御する
- 認証失敗・API 障害いずれの場合も `/service-unavailable` へリダイレクトし、メンテナンス画面を表示する

---

## 目的・ゴール

- ローカル開発時に認証をバイパスし、`DEV_USER_UUID` で指定したユーザーとして即座に動作できる
- フロントエンドに認証ロジックを持たせず、バックエンドに集約する
- 将来 ALB OIDC ヘッダー検証を追加する際、ミドルウェアの拡張のみで対応できる構造にする

---

## 最低要件

1. `users` テーブルに `uuid` カラムを追加する（VARCHAR(36)、NOT NULL、UNIQUE）
2. 既存レコードへ `UUID()` で自動生成する（seed スクリプトで実施）
3. バックエンドに `GET /api/v1/me` エンドポイントを実装する
4. `APP_ENV=development` 時は `.env` の `DEV_USER_UUID` でユーザーを取得して 200 を返す
5. `APP_ENV≠development` 時は 401 を返す（将来の認証実装の TODO）
6. 認証処理は `APP_ENV` で分岐するミドルウェアとして実装する
7. 環境変数 `DEV_USER_UUID` を `.env.local.example` に追加する
8. フロントエンドは初回起動時に `GET /api/v1/me` を必ず実行する
9. `GET /api/v1/me` が 200 の場合はユーザー情報を保持してページを表示する
10. `GET /api/v1/me` が 401 またはネットワークエラーの場合は `/service-unavailable` へリダイレクトする
11. `/service-unavailable` ルートを `src/app/router.tsx` に追加する（認証不要）

---

## 確認ステップ 5-3: DB 操作

→ [plans/schema.md](../../schema.md) を参照。

## DB 変更

### マイグレーションファイル

**ファイル名**: `db/migrate/20260415120000_add_uuid_to_users.up.sql`

```sql
ALTER TABLE users
  ADD COLUMN uuid VARCHAR(36) NOT NULL DEFAULT '' AFTER id;

ALTER TABLE users
  ADD UNIQUE KEY uq_users_uuid (uuid);
```

> **方針**: go-clean-arch のルールに従い、`db/migrate/` には DDL のみを含める。
> 既存レコードへの UUID 付与は `db/seed/` の seed スクリプトで実施する。
> 新規レコードは INSERT 時にアプリケーション層で UUID を生成して渡す。

### Seed ファイル

**ファイル名**: `db/seed/004_users_uuid_backfill.sql`

```sql
UPDATE users SET uuid = UUID() WHERE uuid = '';
```

> **方針**: 既存レコードへの UUID 付与は seed スクリプト（DML）で実施する。開発環境での `make db-seed` 実行時に適用される。本番環境では別途運用手順でこの UPDATE を実行すること。

### domain 変更

```go
// domain/user.go
type User struct {
    ID        uint64 `json:"id"`
    UUID      string `json:"uuid"`
    FirstName string `json:"first_name"`
    LastName  string `json:"last_name"`
}
```

---

## バックエンド実装

### ディレクトリ構成

```
auth/
  service.go          # UserRepository インターフェース宣言（消費側で宣言）・AuthService 実装
  mocks/              # テスト用 mock（手動保守）
internal/rest/
  auth.go             # AuthService インターフェース宣言（消費側で宣言）・認証ミドルウェア + /api/v1/me ハンドラー
  mocks/              # テスト用 mock（手動保守）
internal/repository/mysql/
  user.go             # GetByUUID メソッドを追加
```

### 認証ミドルウェア

```
APP_ENV=development の場合:
  1. DEV_USER_UUID（env）でユーザーを DB から取得
  2. c.Set("authUser", user) にセットして next() を呼ぶ

APP_ENV≠development の場合:
  1. 401 Unauthorized を返す（TODO: 将来 ALB OIDC ヘッダー検証に差し替える）
```

将来の拡張ポイント（ミドルウェア内の判定順）:

```
1. X-Amzn-Oidc-Data ヘッダーあり → ES256 署名検証 → ユーザー取得
2. APP_ENV=development → DEV_USER_UUID で取得
3. それ以外 → 401
```

### GET /api/v1/me

- **メソッド**: GET
- **パス**: `/api/v1/me`
- **認証**: 認証ミドルウェア必須
- **レスポンス (200)**:

  ```json
  {
    "id": 1,
    "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "first_name": "太郎",
    "last_name": "山田"
  }
  ```

- **レスポンス (401)**:

  ```json
  { "message": "Unauthorized" }
  ```

### Repository

`UserRepository` インターフェース（`auth/service.go` で消費側宣言）。

```go
// auth/service.go
type UserRepository interface {
    GetByUUID(ctx context.Context, uuid string) (domain.User, error)
}
```

```go
// internal/repository/mysql/user.go
func (r *userRepository) GetByUUID(ctx context.Context, uuid string) (domain.User, error) {
    // SELECT id, uuid, first_name, last_name FROM users WHERE uuid = ? AND deleted_at IS NULL
}
```

### DI 配線（app/main.go）

```go
appEnv := getEnv("APP_ENV", "development")
defaultUserUUID := getEnv("DEV_USER_UUID", "")

apiGroup := e.Group("/api/v1")
apiGroup.Use(rest.AuthMiddleware(appEnv, defaultUserUUID, userRepo))
rest.NewAuthHandler(apiGroup, userRepo)
```

### 環境変数

| 変数名          | デフォルト | 説明                              |
| --------------- | ---------- | --------------------------------- |
| `DEV_USER_UUID` | （空文字） | dev 環境で使用するユーザーの UUID |

**セットアップ手順**（初回のみ）:

```bash
# マイグレーション実行後に UUID を取得して .env.local に設定する
mysql -e "SELECT uuid FROM users WHERE id = 1;" sample
# → .env.local に DEV_USER_UUID=<取得した UUID> を追加
```

---

## フロントエンド実装

### フロー

```
アプリ起動
  ↓
ProtectedRoute が GET /api/v1/me を実行
  ├─ 200 → AuthContext にユーザー情報を保持 → ページ表示
  ├─ 401 → /service-unavailable へリダイレクト（reason=unauthenticated）
  └─ ネットワークエラー等 → /service-unavailable へリダイレクト（reason=api_unavailable）

/service-unavailable（ServiceUnavailablePage）
  ├─ マウント時に GET /api/v1/me を再確認
  │   ├─ 200 → / へリダイレクト（API 復旧）
  │   └─ エラー → 「ただいまメンテナンス中です。」画面を表示
```

### ディレクトリ構成（FSD）

```
src/
  shared/
    api/
      client.ts          # apiFetch に HttpError クラスを追加
    auth/
      auth.tsx           # AuthContext / AuthProvider / useAuth
      index.ts           # 外部向け Public API（AuthProvider, useAuth を export）
  app/
    routes/
      ProtectedRoute.tsx # 認証チェック + リダイレクト（401/ネットワークエラー → /service-unavailable）
    router.tsx           # /service-unavailable ルートを追加・ProtectedRoute でラップ
  pages/
    service-unavailable/
      ui/
        ServiceUnavailablePage.tsx # メンテナンス画面 + マウント時 /api/v1/me チェック
```

> **FSD 配置方針**: Auth session management（AuthContext / AuthProvider / useAuth）は FSD の Quick Placement Table に従い `shared/auth/` に配置する。`shared/` 内は slice なしでセグメント直下に配置するため、外部 import は `shared/auth/index.ts` 経由とする。実装ファイルは `auth.tsx`（`context.tsx` ではない）。

### apiFetch の修正

```ts
// shared/api/client.ts
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    throw new HttpError(res.status, `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
```

### AuthContext

```ts
// shared/auth/context.tsx
type AuthUser = {
  id: number;
  uuid: string;
  firstName: string;
  lastName: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
};
```

### ProtectedRoute

```tsx
// app/routes/ProtectedRoute.tsx
// GET /api/v1/me を呼び出し、401 なら /dev/login へ Navigate
// 200 なら AuthContext に user をセットして children を描画
// ローディング中はスピナーまたは null を返す
```

### router.tsx の変更

```tsx
// /service-unavailable ルートを追加（認証不要）
// 既存ルート（/、/groups、/users 等）を ProtectedRoute でラップ
// AuthProvider は Layout 内に配置
```

### ServiceUnavailablePage

```tsx
// pages/service-unavailable/ui/ServiceUnavailablePage.tsx
// マウント時に GET /api/v1/me を実行する
//   - 200 の場合: / へリダイレクト（API が復旧済み）
//   - それ以外: 「ただいまメンテナンス中です。」画面を表示
// 表示内容:
//   - タイトル: "ただいまメンテナンス中です。"
//   - 本文: "ご迷惑をおかけし申し訳ありません。しばらくしてから再度アクセスしてください。"
//   - フルスクリーン中央寄せ（Apple HIG 準拠、カードなし）
//   - ローディング中は null を表示（reason state は受け取るが UI では使用しない）
```

### GET /api/v1/me 呼び出し型

```ts
type MeResponse = {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
};
```

---

## ユニットテストケース

### バックエンド

| #   | テスト内容                                                                          |
| --- | ----------------------------------------------------------------------------------- |
| 1   | `APP_ENV=development` + 有効な `DEV_USER_UUID` → 200 とユーザー情報を返す           |
| 2   | `APP_ENV=development` + 存在しない UUID → 404 を返す                                |
| 3   | `APP_ENV=development` + `DEV_USER_UUID` が空 → 設定ミスとして 500 または 401 を返す |
| 4   | `APP_ENV=production` → 401 を返す                                                   |

### フロントエンド

| #   | テスト内容                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `GET /api/v1/me` が 200 → ユーザー情報が AuthContext に保持される                                             |
| 2   | `GET /api/v1/me` が 401 → `/service-unavailable` へリダイレクトされる（reason=unauthenticated）               |
| 3   | `GET /api/v1/me` がネットワークエラー → `/service-unavailable` へリダイレクトされる（reason=api_unavailable） |
| 4   | `apiFetch` が 401 を throw したとき `HttpError.status === 401` で判別できる                                   |
| 5   | `/service-unavailable` でマウント時に 200 が返ると `/` へリダイレクトされる                                   |
| 6   | `/service-unavailable` でエラーが続くと「ただいまメンテナンス中です。」が表示される                           |

---

## TODO（将来実装）

- `APP_ENV≠development` 時の本番認証（ALB OIDC ヘッダー検証 または JWT 検証）
- `GET /api/v1/me` で取得したユーザー情報を UI に表示（ヘッダー等）

---

## 実装上の注意

- `GET /api/v1/me` の認証ミドルウェアは将来の ALB OIDC 対応を見越して拡張ポイントを明示しておく
- `apiFetch` への `HttpError` 追加は既存の呼び出し元に影響しない（`Error` のサブクラスのため）
- Protected Route は `router.tsx` の `Layout` 内（RouterProvider 内側）に置くことで `useNavigate` が使用可能になる
- 既存レコードへの UUID 付与（`UPDATE users SET uuid = UUID()`）は `db/seed/004_users_uuid_backfill.sql` で実施する。本番環境では `make db-seed` とは別に運用手順として個別に実行すること
- `ServiceUnavailablePage` は reason state（`unauthenticated` / `api_unavailable`）を受け取るが UI では使用しない（将来の分岐のためのみ保持）
