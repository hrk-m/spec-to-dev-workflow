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
