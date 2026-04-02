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
internal/repository/inmem/  →  {feature} repository IF
  (in-memory adapter, テスト用)
db/migrations/              →  DB schema migration
```

- `domain/`: フレームワーク依存ゼロ。純粋な struct とセンチネルエラーのみ
- `hello/`, `group/` など機能別パッケージ: ビジネスロジックを実装し、repository interface を宣言する
- `internal/repository/mysql/`: MySQL ベースの repository adapter を実装する
- `internal/repository/inmem/`: in-memory の repository adapter を実装する（テスト・ローカル開発用）
- `internal/rest/`: Echo ハンドラ。上位層のインターフェースを定義し、DI で受け取る

### インターフェース定義の配置

インターフェースは**消費側**で定義する。たとえば `HelloService` と `GroupService` は `internal/rest/` が定義し、`GroupRepository` は `group/` が定義する。これにより delivery 層と use case 層が実装詳細に依存しない。

### エラーハンドリング

- `domain/errors.go` にセンチネルエラーを集約
- `internal/rest/errors.go` でエラーを HTTP ステータスコードにマッピング
- ハンドラは `ResponseError{Message}` で JSON エラーレスポンスを返す

## コーディング規約

- すべての公開シンボルにドキュメントコメントを付ける
- テストファイルは `package xxx_test`（外部テストパッケージ）を使用
- lll: 行の上限 160 文字、funlen: 関数は 150 行・80 文以内
- lint 対象からテストファイルを除外（`.golangci.yml` の `exclude-files`）

## テスト方針

- **use case 層**: repository interface を小さな mock で差し替えてテストする
- **delivery 層**: `testify/mock` で use case をモック化し、httptest でエンドポイントを検証する
- **repository 層**: `internal/repository/inmem/` の in-memory 実装でユニットテスト、または MySQL integration test で振る舞いを検証する
- mock は `mocks/` ディレクトリではなく、テストファイル内にインラインで定義する（`mockXxxRepository`, `mockXxxService` 型をテストファイルの先頭に配置）
- mock は実装変更と同じ変更セットで追随させる
- エラー系（センチネルエラー、予期しないエラー）のケースを必ず網羅する
