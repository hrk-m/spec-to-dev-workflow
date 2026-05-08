# Access Log（アクセスログ）

## 目的

システム障害・問題発生時に「どこで・誰が・どのリクエストで・いつ問題が起きたか」を素早くキャッチする。

## 機能概要

- BE（sample-api）と FE（sample-front Bun プロキシ）の両方でアクセスログを出力する
- ログは JSON 形式で stdout に出力する
- 共通フィールド（`time`・`endpoint`・`login_user`・`latency_s`・`status`・`header`・`request_body`）は BE/FE で統一する
- 実装言語の制約により、ヘッダーの値型・キー形式は BE/FE で異なる（BE: `[]string` + Pascal Case、FE: `string` + lowercase）
- BE は `slog` の自動付与フィールド（`level`・`msg`）が追加される
- `header` は **ホワイトリスト方式** で triage に必要なものだけを記録する（後述「ヘッダー記録ポリシー」）
- `request_body` は **JSON 限定 / 4KB 上限 / 機微キーマスク** のポリシーで記録する（後述「ボディ記録ポリシー」）。`response_body` は記録しない

## ヘッダー記録ポリシー

`header` フィールドには以下の許可リストに含まれるヘッダーのみを記録する。許可リスト外のヘッダー（`Authorization`・`Cookie`・`User-Agent`・`Sec-Fetch-*`・`Accept`・`Accept-Encoding`・`Accept-Language`・`Connection`・`Host` など）はログ出力時に**完全に除外**する（マスクではなく削除）。

| ヘッダー名（BE Pascal Case / FE lowercase） | 残す理由                            |
| ------------------------------------------- | ----------------------------------- |
| `Referer` / `referer`                       | 流入元 URL（triage で経路を追える） |
| `Sec-Ch-Ua` / `sec-ch-ua`                   | ブラウザ名+バージョン               |
| `Sec-Ch-Ua-Mobile` / `sec-ch-ua-mobile`     | モバイル判定 (`?0` / `?1`)          |
| `Sec-Ch-Ua-Platform` / `sec-ch-ua-platform` | OS 識別                             |

`Authorization` ヘッダーは値のマスクではなく**ログから完全削除**する。許可リスト外のため記録されない。

## ボディ記録ポリシー（request_body のみ）

`request_body`（リクエストボディ）を記録する。`response_body` は記録しない（status のみで十分との判断）。

### 対象とする Content-Type

- リクエストの `Content-Type` ヘッダーに `application/json` を含む場合のみ記録対象とする
- それ以外（`multipart/form-data` / `application/x-www-form-urlencoded` / `text/*` / バイナリ等）は **フィールド自体を出力しない**
- 空ボディの場合（GET / DELETE 等）も **フィールド自体を出力しない**

### サイズ上限

- **4096 バイト（4KB）** まで記録する
- 4KB を超える場合は `{ "_truncated": true, "size_bytes": <実バイト数> }` を `request_body` の値として記録する（中身は出さない）

### JSON パース失敗時

- `application/json` を期待したが JSON として解釈できない場合は `{ "_parse_error": true }` を記録する

### 機微情報マスク

JSON ボディを再帰的に走査し、以下の **マスク対象キー名**（大文字小文字を区別しない）に一致するキーの値を `[REDACTED]` に置換してから記録する。ネストオブジェクト・配列内のオブジェクトの中まで再帰的に適用する。

| マスク対象キー  | 例                                                |
| --------------- | ------------------------------------------------- |
| `password`      | `POST /api/v1/auth/login` の `password`           |
| `token`         | 一般的な汎用トークン                              |
| `access_token`  | OAuth・API 発行トークン                           |
| `refresh_token` | リフレッシュトークン                              |
| `api_key`       | API キー                                          |
| `secret`        | 秘密鍵・client_secret 等                          |
| `authorization` | ボディに混入した authorization 系の値（稀ケース） |

マスクの適用例:

入力 JSON

```json
{ "email": "user@example.com", "password": "p@ssw0rd", "remember": true }
```

ログに残る形

```json
{ "email": "user@example.com", "password": "[REDACTED]", "remember": true }
```

ネスト例:

入力 JSON

```json
{
  "user": { "email": "u@e.com", "ApiKey": "abc" },
  "tokens": [{ "access_token": "x" }]
}
```

ログに残る形

```json
{
  "user": { "email": "u@e.com", "ApiKey": "[REDACTED]" },
  "tokens": [{ "access_token": "[REDACTED]" }]
}
```

## 変更対象システム

- BE: sample-api（Go / Echo）
- FE: sample-front（Bun プロキシ `src/proxy.ts`）

---

## BE（sample-api）

### ファイル

| ファイル                           | 役割             |
| ---------------------------------- | ---------------- |
| `internal/rest/access_log.go`      | ミドルウェア実装 |
| `internal/rest/access_log_test.go` | ユニットテスト   |
| `app/main.go`                      | ミドルウェア登録 |

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
4. リクエストボディの取得（`Content-Type` に `application/json` を含む場合のみ）:
   - `c.Request().Body` から最大 4097 バイト（4KB + 1）読み込む（`io.LimitReader` 等を利用）
   - 読み込んだ内容を `c.Request().Body = io.NopCloser(bytes.NewReader(buf))` でハンドラーが再度読めるように戻す
   - 4KB を超えたら truncated 扱いにする（実バイト数を別途取得）
5. `c.Next()` を実行（ハンドラー処理）
6. `c.Next()` 返却後:
   - `endpoint` = `c.Request().Method + " " + c.Request().URL.Path`
   - `status` = `c.Response().Status`
   - `latency_s` = `time.Since(start).Seconds()`
   - `header` = リクエストヘッダーから許可リスト（`Referer` / `Sec-Ch-Ua` / `Sec-Ch-Ua-Mobile` / `Sec-Ch-Ua-Platform`）のみを抽出して記録（許可リスト外は完全削除）
   - `request_body` = 「ボディ記録ポリシー」に従ってフィルタ・マスク・truncate して記録（記録対象外なら field 自体を出さない）
7. `slog.Info()` で JSON ログを stdout に出力

### ログ項目

| フィールド     | 型      | 内容                                                                                                          |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `time`         | string  | ISO 8601 形式（`slog` の自動付与）                                                                            |
| `level`        | string  | `"INFO"` 固定（`slog` の自動付与）                                                                            |
| `msg`          | string  | `"access"` 固定（`slog` の自動付与）                                                                          |
| `endpoint`     | string  | `METHOD /path`（実パス、例: `GET /api/v1/users/123`）                                                         |
| `login_user`   | string  | `authUser.UUID`（未設定 = `""`）                                                                              |
| `latency_s`    | float64 | レスポンスまでの秒数                                                                                          |
| `status`       | int     | HTTP ステータスコード                                                                                         |
| `header`       | object  | 許可リスト（`Referer` / `Sec-Ch-Ua` / `Sec-Ch-Ua-Mobile` / `Sec-Ch-Ua-Platform`）に含まれるヘッダーのみを記録 |
| `request_body` | object  | リクエストボディ（JSON のみ・4KB 上限・機微キーマスク。記録対象外時は field 自体を出さない）                  |

### ヘッダーフィルタ仕様

`c.Request().Header` を走査し、上記許可リストに含まれるヘッダー（大文字・小文字を問わず）のみを抽出して `header` に記録する。許可リスト外のヘッダー（`Authorization`・`Cookie`・`User-Agent`・`Sec-Fetch-*`・`Accept`・`Accept-Encoding`・`Accept-Language`・`Connection` など）は完全に削除し、ログに含めない。

### ログサンプル

GET（リクエストボディなし）:

```json
{
  "time": "2026-04-30T10:00:01Z",
  "level": "INFO",
  "msg": "access",
  "endpoint": "GET /api/v1/users/123",
  "login_user": "abc-uuid",
  "latency_s": 0.042,
  "status": 200,
  "header": {
    "Referer": ["http://localhost:3000/"],
    "Sec-Ch-Ua": ["\"Chromium\";v=\"146\", \"Google Chrome\";v=\"146\""],
    "Sec-Ch-Ua-Mobile": ["?0"],
    "Sec-Ch-Ua-Platform": ["\"macOS\""]
  }
}
```

POST（リクエストボディあり・機微キーマスク）:

```json
{
  "time": "2026-04-30T10:00:02Z",
  "level": "INFO",
  "msg": "access",
  "endpoint": "POST /api/v1/auth/login",
  "login_user": "",
  "latency_s": 0.085,
  "status": 200,
  "header": { "Referer": ["http://localhost:3000/"] },
  "request_body": { "email": "user@example.com", "password": "[REDACTED]" }
}
```

### `slog` 設定

- デフォルトロガー: `slog.NewJSONHandler(os.Stdout, nil)` で初期化
- テスト用に `*slog.Logger` を引数で注入できる設計（テスト時は `bytes.Buffer` に向けたハンドラを渡す）
- `go.mod` への変更は不要（`log/slog` は Go 1.21 以降の標準ライブラリ）

### テストケース

| #   | ケース                                                                       | 検証内容                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 認証済みリクエスト（authUser セット済み）                                    | `login_user` に UUID が記録される／`X-Login-User` レスポンスヘッダーが付与される                                                                                                                           |
| 2   | `authUser` が未設定（単体テスト用：`AuthMiddleware` を通さない直接呼び出し） | `login_user = ""`                                                                                                                                                                                          |
| 3   | レイテンシ                                                                   | `latency_s ≥ 0` の float64                                                                                                                                                                                 |
| 4   | ステータスコード                                                             | 実際のレスポンスステータスが記録される                                                                                                                                                                     |
| 5   | ヘッダー許可リスト                                                           | 許可リスト内のヘッダー（`Referer` / `Sec-Ch-Ua` / `Sec-Ch-Ua-Mobile` / `Sec-Ch-Ua-Platform`）のみが `header` に含まれ、`Authorization` / `Cookie` / `User-Agent` / `Sec-Fetch-*` / `Accept` 等は含まれない |
| 6   | request_body 記録（JSON）                                                    | `Content-Type: application/json` のリクエストで `request_body` が記録される                                                                                                                                |
| 7   | request_body マスク                                                          | `password` / `token` / `access_token` / `refresh_token` / `api_key` / `secret` / `authorization` の値が `[REDACTED]` に置換される（大文字小文字無視・ネスト再帰対象）                                      |
| 8   | request_body 非 JSON / 空                                                    | `Content-Type` が `application/json` 以外、または body が空のとき `request_body` フィールド自体が出力されない                                                                                              |
| 9   | request_body 4KB 超                                                          | 4KB を超えた場合 `request_body = { "_truncated": true, "size_bytes": N }` が出力される                                                                                                                     |
| 10  | request_body パース失敗                                                      | JSON として解釈できない場合 `request_body = { "_parse_error": true }` が出力される                                                                                                                         |
| 11  | request_body 取得後にハンドラーが再度 body を読める                          | ミドルウェアが body を読み戻していることを検証（ハンドラーで JSON デコードできることを確認）                                                                                                               |

---

## FE（sample-front / Bun プロキシ）

### ファイル

| ファイル            | 役割                                         |
| ------------------- | -------------------------------------------- |
| `src/index.ts`      | サーバーエントリー（ルート登録のみ）         |
| `src/proxy.ts`      | `handleApiProxy` 関数（プロキシ + ログ処理） |
| `src/proxy.test.ts` | ユニットテスト                               |

### 対象パス

`/api/*` のみ（その他のパス・静的ファイルはログ対象外）

### 処理フロー

**BE 接続成功時**:

1. タイマー開始（`performance.now()`）
2. リクエストヘッダーをコピー（`new Headers(req.headers)`）、`host` ヘッダーを削除
3. リクエストボディの取得（`Content-Type` に `application/json` を含む場合のみ）:
   - `req.clone().text()` 等でボディ文字列を取得（オリジナルは BE 転送に残す）
   - 4KB を超える場合は truncated 扱い
4. BE に `fetch(upstreamUrl, { method, headers, body })` で転送
5. BE レスポンスから `x-login-user` ヘッダーを取得（なければ `""`）
6. `latency_s` を計算
7. レスポンスヘッダーをコピーして `x-login-user` を削除
8. ログ用ヘッダーを生成（リクエストヘッダーから許可リスト（`referer` / `sec-ch-ua` / `sec-ch-ua-mobile` / `sec-ch-ua-platform`）のみを抽出。許可リスト外は完全削除）
9. ログ用 `request_body` を生成（「ボディ記録ポリシー」に従う。記録対象外なら field 自体を出さない）
10. JSON ログを `process.stdout.write()` で出力
11. ブラウザにレスポンスを返す

**BE 接続失敗時**（`fetch` が例外をスロー）:

1. `error_message` フィールドを追加してログ出力（`status = 0`）
2. ブラウザに `502 Bad Gateway` を返す

### ログ項目

| フィールド      | 型     | 内容                                                                                                                                      |
| --------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `time`          | string | ISO 8601 形式（`new Date().toISOString()`）                                                                                               |
| `endpoint`      | string | `METHOD /path`（実パス、例: `GET /api/users/123`）                                                                                        |
| `login_user`    | string | `x-login-user` ヘッダー値（なければ `""`）                                                                                                |
| `latency_s`     | number | レスポンスまでの秒数（`(performance.now() - start) / 1000`）                                                                              |
| `status`        | number | HTTP ステータスコード（BE 接続失敗時 = `0`）                                                                                              |
| `header`        | object | 許可リスト（`referer` / `sec-ch-ua` / `sec-ch-ua-mobile` / `sec-ch-ua-platform`）に含まれるヘッダーのみを記録（`Record<string, string>`） |
| `request_body`  | object | リクエストボディ（JSON のみ・4KB 上限・機微キーマスク。記録対象外時は field 自体を出さない）                                              |
| `error_message` | string | BE 接続失敗時のみ追加                                                                                                                     |

### ヘッダーフィルタ仕様

リクエストヘッダーを走査し、許可リスト（`referer` / `sec-ch-ua` / `sec-ch-ua-mobile` / `sec-ch-ua-platform`、大文字・小文字を問わず）に含まれるキーのみを抽出して `header` に記録する。許可リスト外のヘッダー（`authorization`・`cookie`・`user-agent`・`sec-fetch-*`・`accept`・`accept-encoding`・`accept-language`・`connection`・`host` など）は完全に削除し、ログに含めない。

### ログサンプル

```json
{
  "time": "2026-04-30T10:00:01Z",
  "endpoint": "GET /api/v1/users/123",
  "login_user": "abc-uuid",
  "latency_s": 0.045,
  "status": 200,
  "header": {
    "referer": "http://localhost:3000/",
    "sec-ch-ua": "\"Chromium\";v=\"146\", \"Google Chrome\";v=\"146\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\""
  }
}
```

### lint 対応

- `no-console` ルールに従い `console.log` は使用禁止
- 出力は `process.stdout.write(JSON.stringify(log) + "\n")` を使用

### テスト方法

- `src/proxy.ts` に `export async function handleApiProxy(...)` として実装し、`src/index.ts` のルートハンドラーから呼び出す
- `src/proxy.test.ts` に `// @vitest-environment node` を付与
- `vi.stubGlobal("fetch", vi.fn())` でグローバル `fetch` をモック

### テストケース

| #   | ケース                            | 検証内容                                                                                                                                                                                                   |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | BE 接続成功 + `x-login-user` あり | `login_user` に UUID が記録される                                                                                                                                                                          |
| 2   | BE 接続成功 + `x-login-user` なし | `login_user = ""`                                                                                                                                                                                          |
| 3   | BE 接続成功                       | ブラウザ向けレスポンスに `x-login-user` ヘッダーが存在しない                                                                                                                                               |
| 4   | BE 接続失敗（`fetch` 例外）       | `error_message` フィールドが追加される、`status = 0`                                                                                                                                                       |
| 5   | ヘッダー許可リスト                | 許可リスト内のヘッダー（`referer` / `sec-ch-ua` / `sec-ch-ua-mobile` / `sec-ch-ua-platform`）のみが `header` に含まれ、`authorization` / `cookie` / `user-agent` / `sec-fetch-*` / `accept` 等は含まれない |
| 6   | request_body 記録（JSON）         | `Content-Type: application/json` のリクエストで `request_body` が記録される                                                                                                                                |
| 7   | request_body マスク               | `password` / `token` / `access_token` / `refresh_token` / `api_key` / `secret` / `authorization` の値が `[REDACTED]` に置換される（大文字小文字無視・ネスト再帰対象）                                      |
| 8   | request_body 非 JSON / 空         | `Content-Type` が `application/json` 以外、または body が空のとき `request_body` フィールド自体が出力されない                                                                                              |
| 9   | request_body 4KB 超               | 4KB を超えた場合 `request_body = { "_truncated": true, "size_bytes": N }` が出力される                                                                                                                     |
| 10  | request_body パース失敗           | JSON として解釈できない場合 `request_body = { "_parse_error": true }` が出力される                                                                                                                         |
| 11  | リクエストボディの BE 転送整合性  | `request_body` キャプチャ後も BE への転送ボディが破損しないこと（`req.clone()` を利用）                                                                                                                    |
