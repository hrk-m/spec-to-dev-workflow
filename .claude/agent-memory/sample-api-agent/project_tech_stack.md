---
name: Tech Stack & Architecture
description: Go 1.25 / Echo v4 / MySQL / Clean Architecture の実装パターン（フレームワーク・ライブラリ・レイヤー構成）
type: project
---

## 技術スタック

- **言語**: Go 1.25
- **HTTP フレームワーク**: Echo v4 (`labstack/echo`)
- **ミドルウェア**: CORS（`echo/v4/middleware`）
- **DB ドライバ**: `go-sql-driver/mysql`
- **テスト**: testify (`assert` + `mock`)
- **Lint**: golangci-lint v2
- **インフラ**: Docker Compose（MySQL）
- **DB マイグレーション**: golang-migrate（`db/migrate/` に `.up.sql` のみ）
- **ログ**: `log/slog`（Go 1.21+ 標準ライブラリ）を使用。`slog.NewJSONHandler(os.Stdout, nil)` で JSON 形式で stdout に出力。`log.Fatal` は起動時エラーのみに使用
- **ヘルスチェック**: `health.go` で `DBPinger` IF を消費側（`internal/rest/`）で定義し `*sql.DB` が実装（`GET /health`）

## Clean Architecture レイヤー構成

```
internal/rest/{feature}.go     → Service IF を定義 (delivery 層)
{feature}/service.go           → UseCase + Repository IF を定義 (use case 層)
internal/repository/mysql/{feature}.go → Repository 実装 (adapter 層)
domain/*.go                    → エンティティ + センチネルエラー（外部依存ゼロ）
app/main.go                    → DI 配線・サーバー起動のみ
```

**Why:** Clean Architecture で依存方向を内側へ向け、各層を独立してテストできる構造を維持する。

**How to apply:** 新機能追加時は必ず domain → service → repository → handler → main.go の順で編集する。IF は消費側で宣言すること。

## 実装済みドメイン

- **group**: グループ CRUD + メンバー管理（一覧・追加・削除）・非メンバー一覧
- **user**: ユーザー一覧取得（`GET /api/v1/users`）
- **auth**: 認証ミドルウェア + `GET /api/v1/me`（開発環境では `DEV_USER_UUID` 環境変数を使用）

## mysql.UserRepository の共有

`mysql.UserRepository` は `group.UserRepository`（GetByID, CountByIDs）、`user.UserRepository`（ListUsers）、`auth.UserRepository`（GetByUUID）の 3 つの IF を実装する単一 struct。`app/main.go` で 1 インスタンスを `group.NewService`・`user.NewService`・`auth.NewService` の 3 つに渡す。

## 認証パターン

- `auth/service.go`: `auth.Service`（GetByUUID）+ `auth.UserRepository` IF（GetByUUID）
- `internal/rest/auth.go`: `AuthService` IF（GetByUUID）+ `AuthHandler`（GetMe）+ `AuthMiddleware`
- `AuthMiddleware` は `/api/v1` ルートグループに適用し、`c.Set("authUser", user)` で認証済みユーザーをコンテキストにセット
- `User` ドメインモデルに `UUID string` フィールドが追加（`db/migrate/20260415120000_add_uuid_to_users.up.sql` で追加）
