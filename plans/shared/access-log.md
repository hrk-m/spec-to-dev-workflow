# Access Log（アクセスログ）

## 目的

システム障害・問題発生時に「どこで・誰が・どのリクエストで・いつ問題が起きたか」を素早くキャッチする。

## 機能概要

- BE（sample-api）と FE（sample-front Bun プロキシ）の両方でアクセスログを出力する
- ログは JSON 形式で stdout に出力する
- 共通フィールド（`time`・`endpoint`・`login_user`・`latency_s`・`status`・`header`）は BE/FE で統一する
- 実装言語の制約により、ヘッダーの値型・キー形式は BE/FE で異なる（BE: `[]string` + Pascal Case、FE: `string` + lowercase）
- BE は `slog` の自動付与フィールド（`level`・`msg`）が追加される

## 変更対象システム

- BE: sample-api（Go / Echo）
- FE: sample-front（Bun プロキシ `src/proxy.ts`）

---

## BE（sample-api）

### ファイル

| ファイル | 役割 |
| --- | --- |
| `internal/rest/access_log.go` | ミドルウェア実装 |
| `internal/rest/access_log_test.go` | ユニットテスト |
| `app/main.go` | ミドルウェア登録 |

### ミドルウェア登録順（`app/main.go`）

`app/main.go` で `slog.Logger` を初期化して `AccessLogMiddleware` に DI する。

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

apiGroup.Use(rest.AuthMiddleware(...))              // 1 層目（外側）
apiGroup.Use(rest.AccessLogMiddleware(logger))      // 2 層目（内側）
```

`AuthMiddleware` の内側に登録することで、`c.Next()` 前の時点で `authUser` がコンテキストにセット済みの状態を保証する。
認証失敗（401）のリクエストは `AuthMiddleware` で処理が完結するため、アクセスログには記録されない。
なお、`authUser` 未設定ケースは `AccessLogMiddleware` の単体テスト（`AuthMiddleware` を通さない直接呼び出し）を想定した仕様である。

### 処理フロー

1. タイマー開始（`time.Now()`）
2. コンテキストから `authUser` を取得し UUID を読む（未設定 = `""`）
3. レスポンスヘッダーに `X-Login-User: <uuid>` をセット（Bun プロキシが読む用）
4. `c.Next()` を実行（ハンドラー処理）
5. `c.Next()` 返却後:
   - `endpoint` = `c.Request().Method + " " + c.Request().URL.Path`
   - `status` = `c.Response().Status`
   - `latency_s` = `time.Since(start).Seconds()`
   - `header` = リクエストヘッダー（`Authorization` は `[REDACTED]` にマスクして記録）
6. `slog.Info()` で JSON ログを stdout に出力

### ログ項目

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `time` | string | ISO 8601 形式（`slog` の自動付与） |
| `level` | string | `"INFO"` 固定（`slog` の自動付与） |
| `msg` | string | `"access"` 固定（`slog` の自動付与） |
| `endpoint` | string | `METHOD /path`（実パス、例: `GET /api/v1/users/123`） |
| `login_user` | string | `authUser.UUID`（未設定 = `""`） |
| `latency_s` | float64 | レスポンスまでの秒数 |
| `status` | int | HTTP ステータスコード |
| `header` | object | リクエストヘッダー（`Authorization` は `[REDACTED]` にマスクする） |

### ヘッダーマスク仕様

`c.Request().Header` を走査し、`Authorization`（大文字・小文字を問わず）の値を `[REDACTED]` に置換してからログに書き出す。その他のヘッダーはそのまま出力する。

### ログサンプル

```json
{"time":"2026-04-30T10:00:01Z","level":"INFO","msg":"access","endpoint":"GET /api/v1/users/123","login_user":"abc-uuid","latency_s":0.042,"status":200,"header":{"Authorization":["[REDACTED]"],"User-Agent":["Mozilla/5.0"]}}
```

### `slog` 設定

- デフォルトロガー: `slog.NewJSONHandler(os.Stdout, nil)` で初期化
- テスト用に `*slog.Logger` を引数で注入できる設計（テスト時は `bytes.Buffer` に向けたハンドラを渡す）
- `go.mod` への変更は不要（`log/slog` は Go 1.21 以降の標準ライブラリ）

### テストケース

| # | ケース | 検証内容 |
| --- | --- | --- |
| 1 | 認証済みリクエスト（authUser セット済み） | `login_user` に UUID が記録される／`X-Login-User` レスポンスヘッダーが付与される |
| 2 | `authUser` が未設定（単体テスト用：`AuthMiddleware` を通さない直接呼び出し） | `login_user = ""` |
| 3 | レイテンシ | `latency_s ≥ 0` の float64 |
| 4 | ステータスコード | 実際のレスポンスステータスが記録される |
| 5 | `Authorization` ヘッダーのマスク | ログの `header.Authorization` が `["[REDACTED]"]` になる |

---

## FE（sample-front / Bun プロキシ）

### ファイル

| ファイル | 役割 |
| --- | --- |
| `src/index.ts` | サーバーエントリー（ルート登録のみ） |
| `src/proxy.ts` | `handleApiProxy` 関数（プロキシ + ログ処理） |
| `src/proxy.test.ts` | ユニットテスト |

### 対象パス

`/api/*` のみ（その他のパス・静的ファイルはログ対象外）

### 処理フロー

**BE 接続成功時**:

1. タイマー開始（`performance.now()`）
2. リクエストヘッダーをコピー（`new Headers(req.headers)`）、`host` ヘッダーを削除
3. BE に `fetch(upstreamUrl, { method, headers, body })` で転送
4. BE レスポンスから `x-login-user` ヘッダーを取得（なければ `""`）
5. `latency_s` を計算
6. レスポンスヘッダーをコピーして `x-login-user` を削除
7. ログ用ヘッダーを生成（リクエストヘッダーを複製し、`authorization` を `[REDACTED]` に置換）
8. JSON ログを `process.stdout.write()` で出力
9. ブラウザにレスポンスを返す

**BE 接続失敗時**（`fetch` が例外をスロー）:

1. `error_message` フィールドを追加してログ出力（`status = 0`）
2. ブラウザに `502 Bad Gateway` を返す

### ログ項目

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `time` | string | ISO 8601 形式（`new Date().toISOString()`） |
| `endpoint` | string | `METHOD /path`（実パス、例: `GET /api/users/123`） |
| `login_user` | string | `x-login-user` ヘッダー値（なければ `""`） |
| `latency_s` | number | レスポンスまでの秒数（`(performance.now() - start) / 1000`） |
| `status` | number | HTTP ステータスコード（BE 接続失敗時 = `0`） |
| `header` | object | リクエストヘッダー（`authorization` は `[REDACTED]` にマスクする。`Record<string, string>`） |
| `error_message` | string | BE 接続失敗時のみ追加 |

### ヘッダーマスク仕様

リクエストヘッダーを走査し、キーが `authorization`（大文字・小文字を問わず）のものを `[REDACTED]` に置換してからログに書き出す。その他のヘッダーはそのまま出力する。

### ログサンプル

```json
{"time":"2026-04-30T10:00:01Z","endpoint":"GET /api/v1/users/123","login_user":"abc-uuid","latency_s":0.045,"status":200,"header":{"authorization":"[REDACTED]","user-agent":"Mozilla/5.0"}}
```

### lint 対応

- `no-console` ルールに従い `console.log` は使用禁止
- 出力は `process.stdout.write(JSON.stringify(log) + "\n")` を使用

### テスト方法

- `src/proxy.ts` に `export async function handleApiProxy(...)` として実装し、`src/index.ts` のルートハンドラーから呼び出す
- `src/proxy.test.ts` に `// @vitest-environment node` を付与
- `vi.stubGlobal("fetch", vi.fn())` でグローバル `fetch` をモック

### テストケース

| # | ケース | 検証内容 |
| --- | --- | --- |
| 1 | BE 接続成功 + `x-login-user` あり | `login_user` に UUID が記録される |
| 2 | BE 接続成功 + `x-login-user` なし | `login_user = ""` |
| 3 | BE 接続成功 | ブラウザ向けレスポンスに `x-login-user` ヘッダーが存在しない |
| 4 | BE 接続失敗（`fetch` 例外） | `error_message` フィールドが追加される、`status = 0` |
| 5 | `authorization` ヘッダーのマスク | ログの `header.authorization` が `"[REDACTED]"` になる |
