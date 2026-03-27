# Tech Steering

## スタック

- **言語**: Go 1.25
- **HTTP フレームワーク**: Echo v4 (`labstack/echo`)
- **テスト**: testify (`assert` + `mock`)
- **Lint**: golangci-lint v2

## アーキテクチャ決定

### Clean Architecture の採用

3 層に明確に分離し、依存方向を内側（domain）に向ける。

```
internal/rest/  →  hello/  →  domain/
  (delivery)     (use case)   (entity)
```

- `domain/`: フレームワーク依存ゼロ。純粋な struct とセンチネルエラーのみ
- `hello/` など機能別パッケージ: ビジネスロジックを実装、`domain` に依存
- `internal/rest/`: Echo ハンドラ。上位層のインターフェースを定義し、DI で受け取る

### インターフェース定義の配置

インターフェースは**呼び出し元（delivery 層）**で定義する。たとえば `HelloService` は `internal/rest/` パッケージが定義し、`hello/` パッケージが実装する。これにより delivery 層が use case 層に依存しない。

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

- **use case 層**: 実体を直接インスタンス化してテスト（モック不要）
- **delivery 層**: `testify/mock` で use case をモック化し、httptest でエンドポイントを検証
- エラー系（センチネルエラー、予期しないエラー）のケースを必ず網羅する
