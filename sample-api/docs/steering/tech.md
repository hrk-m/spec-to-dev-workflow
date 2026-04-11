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
- パスパラメータの ID は `strconv.Atoi` でパースし、変換失敗または `< 1` の場合は `getStatusCode` を通さず直接 400 を返す

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

## サービスインターフェース（`GroupService`）

`internal/rest/group.go` に定義された `GroupService` インターフェース。delivery 層が use case 層に依存するパターンを示す。

```go
type GroupService interface {
    ListGroups(ctx context.Context, q string, limit, offset int) ([]domain.Group, int, error)
    GetByID(ctx context.Context, id uint64) (domain.Group, error)
    ListGroupMembers(ctx context.Context, id, limit, offset uint64, q string) ([]domain.GroupMember, int, error)
    Store(ctx context.Context, name, description string) (domain.Group, error)
    Update(ctx context.Context, id int64, name, description string) (*domain.Group, error)
    Delete(ctx context.Context, id int64) error
}
```

`Update` は ID（`int64`）・name・description を受け取り、更新後の `*domain.Group` を返す。`Delete` は ID（`int64`）を受け取り、soft delete を実行する（成功時は `nil`、対象未存在時は `ErrNotFound`）。

`Update` および `Delete` は、`GetByID` や `ListGroupMembers` と同様に、service 層で `id < minID`（`minID = 1`）のバリデーションを行い、不正な ID には `ErrBadParamInput` を返す（repository は呼び出さない）。

## リポジトリインターフェース（`GroupRepository`）

`group/service.go` に定義された `GroupRepository` インターフェース。use case 層が repository adapter に依存するパターンを示す。

```go
type GroupRepository interface {
    ListGroups(ctx context.Context, q string, limit, offset int) ([]domain.Group, int, error)
    GetByID(ctx context.Context, id uint64) (domain.Group, error)
    ListGroupMembers(ctx context.Context, id, limit, offset uint64, q string) ([]domain.GroupMember, int, error)
    Store(ctx context.Context, name, description string) (domain.Group, error)
    Update(ctx context.Context, id int64, name, description string) (*domain.Group, error)
    Delete(ctx context.Context, id int64) error
}
```

`Update` は DB の `groups` テーブルを `WHERE id = ? AND deleted_at IS NULL` で更新し、`RowsAffected() == 0` なら `ErrNotFound` を返す。更新後に `GetByID` で最新状態を取得して返す。`Delete` は `UPDATE groups SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL` で soft delete し、`RowsAffected() == 0` なら `ErrNotFound` を返す。
