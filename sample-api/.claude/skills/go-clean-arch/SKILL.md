---
name: go-clean-arch
description: go-clean-arch プロジェクトの Clean Architecture パターンに従ってコードを生成・修正する。新しいドメイン（Entity / Repository / Service / Handler）を追加する際に使用。実装テンプレートは references/implementation.md、テストパターンは references/testing.md を参照。
---

# go-clean-arch アーキテクチャガイド

## ディレクトリ構造

```
domain/               ← エンティティ + センチネルエラー（外部依存ゼロ）
{domain}/             ← Service（UseCase）+ Repository Interface（消費側宣言）
  mocks/              ← mockery 自動生成（編集禁止）
  service.go
  service_test.go
internal/
  repository/mysql/   ← DB 実装（隠蔽）★ {domain}/repository/ ではない
    {domain}.go       ← 例: todo → internal/repository/mysql/todo.go
    {domain}_test.go
  rest/               ← Echo HTTP ハンドラ + Service Interface（消費側宣言）（隠蔽）
  rest/mocks/         ← mockery 自動生成（編集禁止）
app/main.go           ← DI 配線・サーバー起動のみ（薄く保つ）
```

> ⚠️ **よくある間違い**: Repository 実装を `{domain}/repository/mysql.go` に置かない。
> MySQL 実装は必ず `internal/repository/mysql/{domain}.go` に配置する。

---

## V4 設計原則

### 1. インターフェースは消費側で宣言する

```go
// article/service.go — Service がリポジトリ IF を宣言
type ArticleRepository interface { ... }

// internal/rest/article.go — Handler がサービス IF を宣言
type ArticleService interface { ... }
```

新ドメイン追加時も同じルール: `{domain}/service.go` にリポジトリ IF、`internal/rest/{domain}.go` にサービス IF を宣言する。

### 2. `internal/` で実装詳細を隠蔽

DB・REST などインフラ実装は `internal/` 配下に置く。`domain/` と `{domain}/` はパブリックなまま公開。

### 3. サービス重視のパッケージ構成

`{domain}/` パッケージはビジネスロジックのみ。インフラ実装は `internal/` に分離。

---

## レイヤー構成と依存方向

```
rest → {domain}(Service IF) → domain ← repository
```

- `domain`: 何にも依存しない
- `{domain}/service.go`: `domain` と Interface のみに依存（DB 実装を知らない）
- `internal/rest`: Service Interface に依存（Service 実装を知らない）

---

## 新ドメイン追加の手順

実装コードテンプレートは **[references/implementation.md](references/implementation.md)** を参照。

1. `domain/{domain}.go` — エンティティ定義
2. `{domain}/service.go` — Repository IF + Service 実装
3. `internal/repository/mysql/{domain}.go` — MySQL Repository 実装（`{domain}/repository/` ではない）
4. `internal/rest/{domain}.go` — Handler + Service IF 宣言
5. `app/main.go` — DI 配線追記

関連エンティティの並列フェッチ（`errgroup` + goroutine + channel）も implementation.md に記載。

---

## テスト作成

テストパターンとモック生成手順は **[references/testing.md](references/testing.md)** を参照。

| レイヤー | ファイル | パッケージ | 使用ライブラリ |
|----------|----------|------------|----------------|
| Service | `{domain}/service_test.go` | `package {domain}_test` | mockery mock |
| Repository | `internal/repository/mysql/{domain}_test.go` | `package mysql_test` | sqlmock |
| Handler | `internal/rest/{domain}_test.go` | `package rest_test` | httptest + mockery mock |

---

## 重要なルール

| ルール | 理由 |
|--------|------|
| Service は Repository Interface に依存（MySQL 実装を知らない） | DIP・テスト容易性 |
| Handler は Service Interface に依存 | 同上 |
| `domain/` パッケージは外部依存ゼロ | エンティティの安定性 |
| PreparedStatement は必ず `defer stmt.Close()` | リソースリーク防止。既存 `mysql/article.go` に漏れあり（既知の不整合）、新規コードでは必ず守る |
| エラーレスポンスは必ず `ResponseError{Message: ...}` | レスポンス形式統一。既存 `article.go` に生 string を返す箇所あり（既知の不整合）、新規コードでは必ず守る |
| `getStatusCode`・`ResponseError`・`defaultNum` は再定義禁止 | `rest` パッケージ共有済み、重複でコンパイルエラー |
| バリデーション関数はドメインごとに定義（`isRequestValid` は `*domain.Article` 専用） | シグネチャ不一致でコンパイルエラー |
| REST エンドポイントは V4 時点で CRUD の一部のみ公開で良い | V4 は意図的にシンプル。`article` では `Update` REST は未登録（Service 層のみ実装） |
| Mock は `go generate` で自動生成（手動編集禁止） | 実装と乖離防止 |
| カーソルは `repository.EncodeCursor` / `DecodeCursor` で統一 | Base64+時刻フォーマット統一 |
| 時刻フィールドは `time.Time` で統一 | 型安全性（`string` 使用禁止）。例外: 既存の `domain.Author` は `string` のまま（後方互換） |

---

## エラーハンドリングフロー

```
Handler → getStatusCode(err) → HTTP ステータスコード
  domain.ErrNotFound            → 404
  domain.ErrConflict            → 409
  domain.ErrInternalServerError → 500
  その他                         → 500
```

センチネルエラーは `domain/errors.go` で一元管理。
