---
name: エラーハンドリングとバリデーション
description: ResponseError / getStatusCode / センチネルエラーのマッピング・バリデーション方針
type: project
---

## エラーレスポンス形式

JSON: `{"message": "エラーメッセージ"}`（`rest.ResponseError` struct）

## センチネルエラーとステータスコードのマッピング（internal/rest/errors.go）

| ドメインエラー | HTTP ステータス |
|---|---|
| `domain.ErrBadParamInput` | 400 |
| `domain.ErrNotFound` | 404 |
| `domain.ErrConflict` | 409 |
| `domain.ErrInternalServerError` | 500 |
| その他（デフォルト） | 500 |

## バリデーション方針

- path パラメータの ID: handler で `strconv.Atoi` → 変換失敗または `< 1` は直接 400 を返す（`getStatusCode` を経由しない）
- リクエストボディ: `c.Bind()` 失敗 → `err.Error()` をそのまま ResponseError にセット
- ビジネスバリデーション（name 必須・100 文字以内など）: service 層で `domain.ErrBadParamInput` を返す
- クエリパラメータ: handler の parse 関数（`parseGroupLimit` など）で検証し、失敗時は `domain.ErrBadParamInput` を直接返す

**How to apply:** 新しいエラーを domain まで流す場合は `getStatusCode` のマッピングとテストを同時に追加する。
