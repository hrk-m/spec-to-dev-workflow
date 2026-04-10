# Tech Steering

## スタック

- **言語**: Go 1.25
- **HTTP フレームワーク**: Echo v4 (`labstack/echo`)
- **ミドルウェア**: CORS（`echo/v4/middleware`）
- **DB ドライバ**: `go-sql-driver/mysql`
- **テスト**: testify (`assert` + `mock`)
- **Lint**: golangci-lint v2
- **インフラ**: Docker Compose（MySQL）

## アーキテクチャ決定

### Clean Architecture の採用

3 層に明確に分離し、依存方向を内側（domain）に向ける。

```
internal/rest/              →  {feature}/           →  domain/
  (delivery)                   (use case)              (entity)
internal/repository/mysql/  →  {feature} repository IF
  (repository adapter)
db/migrate/                 →  DB schema migration (golang-migrate)
db/seed/                    →  Seed data (DML only)
```

- `domain/`: フレームワーク依存ゼロ。純粋な struct とセンチネルエラーのみ
- `group/` など機能別パッケージ: ビジネスロジックを実装し、repository interface を宣言する
- `internal/repository/mysql/`: MySQL ベースの repository adapter を実装する
- `internal/rest/`: Echo ハンドラ。上位層のインターフェースを定義し、DI で受け取る

### インターフェース定義の配置

インターフェースは**消費側**で定義する。たとえば `GroupService` は `internal/rest/` が定義し、`GroupRepository` は `group/` が定義する。これにより delivery 層と use case 層が実装詳細に依存しない。

### エラーハンドリング

- `domain/errors.go` にセンチネルエラーを集約
- `internal/rest/errors.go` でエラーを HTTP ステータスコードにマッピング（`ErrBadParamInput` → 400、`ErrNotFound` → 404、`ErrConflict` → 409、`ErrInternalServerError` → 500、その他 → 500）
- ハンドラは `ResponseError{Message}` で JSON エラーレスポンスを返す

## コーディング規約

- すべての公開シンボルにドキュメントコメントを付ける
- テストファイルは `package xxx_test`（外部テストパッケージ）を使用
- lll: 行の上限 160 文字、funlen: 関数は 150 行・80 文以内
- lint 対象からテストファイルを除外（`.golangci.yml` の `exclude-files`）

## テスト方針

- **use case 層**: repository interface を小さな mock で差し替えてテストする
- **delivery 層**: `testify/mock` で use case をモック化し、httptest でエンドポイントを検証する
- **repository 層**: `//go:build integration` タグ付きの統合テストとして実 DB に接続して検証する（`go test -tags integration ./...` で実行）。`health` ハンドラのテストのみ `go-sqlmock` を使用
- mock は `mocks/` ディレクトリに分離配置する（`{feature}/mocks/` に `MockXxxRepository`、`internal/rest/mocks/` に `MockXxxService`）
- mock は手動保守し、interface 変更時は同じ変更セットで追随させる
- エラー系（センチネルエラー、予期しないエラー）のケースを必ず網羅する
