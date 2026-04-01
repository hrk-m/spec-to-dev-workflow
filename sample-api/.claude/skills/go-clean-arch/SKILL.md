---
name: go-clean-arch
description: >
  go-clean-arch プロジェクトの current-state な Clean Architecture パターンに従って
  コード生成・修正・レビューを行う。新しいドメイン（Entity / Repository / Service / Handler）
  の追加、既存レイヤーの修正、DI 配線、テスト追加、エラーフロー確認、
  mock の作成・更新方針の確認で使う。既存コードを最優先の正とする。
---

# go-clean-arch ガイド

> **前提**: このスキルは理想論よりも、現在のリポジトリ実装を正として扱う。

---

## 1. ソースオブトゥルース

判断に迷ったら、以下の優先順位で従う。

1. **対象パッケージの既存コード**
2. この `SKILL.md`
3. `references/` のサンプル

`references/` はテンプレートであり、仕様書ではない。対象ファイルの近傍コードと矛盾したら、
近傍コードのパターンを優先する。

---

## 2. コア構造

Clean Architecture の中心ルールは変わらない。

```text
rest/handler → service/usecase → domain ← repository adapter
```

代表的な配置は次の通り。

```text
domain/                    ← エンティティ + センチネルエラー
{domain}/                  ← Service（UseCase）+ Repository Interface
  mocks/                   ← テスト用 mock（手動保守）
  service.go
  service_test.go
internal/
  repository/mysql/        ← DB 実装
  rest/                    ← HTTP ハンドラ + Service Interface
  rest/mocks/              ← handler/service テスト用 mock（手動保守）
app/main.go                ← DI 配線・サーバー起動
```

---

## 3. 依存ルール

| レイヤー | 依存してよいもの | 避けるもの |
|---|---|---|
| `domain/` | 標準ライブラリのみ | `github.com/` 以下の外部依存、他レイヤー |
| `{domain}/service.go` | `domain/`、標準ライブラリ、純粋な補助ライブラリ、Repository IF | `internal/rest`、`internal/repository/mysql`、DB/HTTP 実装詳細 |
| `internal/rest/` | Service IF、`domain/`、Echo、validator、rest 内共有シンボル | Service 実装への直接依存 |
| `internal/repository/mysql/` | `domain/`、`database/sql`、`internal/repository` の helper、必要な logger / util | Service / handler パッケージへの依存 |
| `app/main.go` | DI に必要な全レイヤー | ビジネスロジック |

ポイントは「依存は内側へ」だが、**service 層が pure な補助ライブラリを使うこと自体は許容**する。
このリポジトリでも `errgroup` や logger を使っている。禁止なのは、adapter 実装への逆依存。

---

## 4. インターフェース配置

インターフェースは**消費側で宣言**する。

```go
// {domain}/service.go
type FooRepository interface { ... }

// internal/rest/foo.go
type FooService interface { ... }
```

- Repository IF は service 側に置く
- Service IF は handler 側に置く
- mysql 実装側や service 実装側に「自分が実装するための IF」を置かない

---

## 5. 追加・修正時の判断順

**Step 1 — エンティティか**

- struct、value object、センチネルエラーは `domain/`
- `domain/` は外部依存を持たせない

**Step 2 — ユースケースか**

- ビジネスロジックは `{domain}/service.go`
- 必要な Repository IF もここで宣言する

**Step 3 — DB / 外部 I/O 実装か**

- `internal/repository/mysql/{domain}.go`
- 上位レイヤーの interface に合わせて実装する

**Step 4 — HTTP 入出力か**

- `internal/rest/{domain}.go`
- Service IF もここで宣言する

**Step 5 — 配線か**

- `app/main.go`
- Repository → Service → Handler の組み立てだけに留める

---

## 6. MUST ルール

### 6-1. 既存コードを優先する

同じ責務の近傍ファイルに既存パターンがあるなら、まずそれに合わせる。
このスキルは既存コードを読むための索引であって、既存コードを上書きする規約ではない。

### 6-2. `domain/` は外部依存ゼロ

`time` などの標準ライブラリは可。外部パッケージ import は禁止。

### 6-3. 共有済みシンボルを再定義しない

`internal/rest` では `ResponseError`、`getStatusCode`、`defaultNum` など
既存の共有シンボルを流用する。別名での重複定義は避ける。

### 6-4. mock は通常のソースとして手動保守する

`mocks/` 配下は生成物ではなく、通常の Go ソースとして扱う。
interface 変更時は mock も同じ変更セットで更新する。

方針:

- 必要なメソッドだけを実装した小さな mock を優先する
- テストごとに必要十分な振る舞いだけを持たせる
- 実装より複雑な mock を作らない
- 生成ツール前提のコメントや運用に依存しない

### 6-5. `app/main.go` を薄く保つ

設定読み込み、接続初期化、DI、サーバ起動に限定する。

### 6-6. 新しい domain エラーを handler まで流すなら、ステータスマッピングも確認する

このリポジトリでは `domain/errors.go` にセンチネルエラーを集約しているが、
**全エラーが自動で HTTP にマップされるわけではない**。

新しいエラーを追加したり、既存の `ErrBadParamInput` のようなエラーを
handler まで返す設計にする場合は、対象 handler の `getStatusCode` とテストも合わせて確認する。

### 6-7. REST は必要な操作だけ公開すればよい

service に存在しても、REST endpoint まで必ず公開する必要はない。

---

## 7. エラーハンドリング

このリポジトリで安定しているパターンは次の通り。

### 7-1. リクエスト入力エラー

- path / query の解析失敗: handler 側で直接返す
- `Bind` 失敗: 生の `err.Error()`
- バリデーション失敗: 生の `err.Error()`

### 7-2. Service / Repository 由来のエラー

- `ResponseError{Message: err.Error()}` でラップして返す

### 7-3. 現在の代表的なマッピング

```text
domain.ErrNotFound            → 404
domain.ErrConflict            → 409
domain.ErrInternalServerError → 500
その他                         → 実装側の getStatusCode に従う
```

補足:

- `domain.ErrBadParamInput` は domain に存在する
- ただし handler 側で必ず 4xx にマップされているとは限らない
- クライアント入力エラーとして見せたい場合は、対象 handler の `getStatusCode` を明示的に更新する

---

## 8. データ・実装上の慣例

### 8-1. 時刻型

- 新しい timestamp フィールドは `time.Time` を優先する
- 既存エンティティが `string` を使っている場合は、移行タスクでない限り安易に型変更しない

### 8-2. カーソル

- cursor pagination は `internal/repository` の `EncodeCursor` / `DecodeCursor` を使う
- 独自の Base64 / time format 実装を増やさない

### 8-3. バリデーション関数

- ドメインごとに閉じた helper 名にする
- 既存の `isRequestValid` を他ドメインで使い回さない

### 8-4. 関連データ取得

- 関連 entity を複数件引くなら `errgroup + goroutine + channel` は有力な選択肢
- ただし、すべてのユースケースで必須ではない。既存サービスの複雑さと利得に合わせる

### 8-5. Repository のクエリ実装

- `QueryContext` 直呼びと `PrepareContext` ベースの両方が現行コードにある
- まずは**同じファイル・同じパッケージの既存パターン**に合わせる
- `PrepareContext` を使う場合の statement lifecycle は、対象ファイルの現行スタイルを踏襲する

ここでは「常にこうすべき」という抽象ルールより、近傍コードとの一貫性を優先する。

---

## 9. レビュー時のチェックリスト

- IF の宣言位置は消費側になっているか
- `domain/` に外部依存が入っていないか
- service が adapter 実装へ逆依存していないか
- handler のエラーレスポンス形式が既存パターンに揃っているか
- 新しい domain エラーを返すなら `getStatusCode` とテストが追随しているか
- cursor / time / validation helper の既存慣例に沿っているか
- `app/main.go` にユースケースが漏れていないか
- mock が interface と整合しているか
- mock が不要に肥大化していないか

---

## 10. Conditional References

必要なときだけ参照する。

- 新しいドメイン追加、Repository / Service / Handler 実装、DI 配線:
  `references/implementation.md`
- Service / Repository / Handler のテスト追加、mock 作成・更新:
  `references/testing.md`
