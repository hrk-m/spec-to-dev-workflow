# PRD: {verb-noun}

> `{verb-noun}` は動詞+名詞形式。例: `list-groups`, `create-group`, `delete-group`

## 概要

| 項目 | 内容 |
|---|---|
| 機能名 | `{verb-noun}` |
| 目的 | ... |
| API | `{METHOD} /api/v1/{path}` |
| 認証 | 必要 / 不要 |
| データソース | MySQL (`sample-api/internal/repository/mysql`) |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### エンドポイント: `{METHOD} /api/v1/{path}`

#### リクエスト仕様

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `field_name` | string | ✓ | ... |

#### バリデーション一覧

| # | 対象フィールド | ルール | エラー時の挙動 |
|---|---|---|---|
| 1 | `field_name` | 空不可（null / undefined / "" 不可） | 400 Bad Request |
| 2 | `field_name` | 最小長: N文字 / 最大長: N文字 | 400 Bad Request |
| 3 | `field_name` | 許可文字種（英数字・記号など） | 400 Bad Request |
| 4 | `num_field` | 正数のみ / 0以上 / 最小値〜最大値 | 400 Bad Request |
| 5 | `list_field` | 要素型・重複禁止・件数上限 | 400 Bad Request |
| 6 | `id_field` | DB 上に存在すること（外部キー整合性） | 404 Not Found |
| 7 | `field_a` | `field_b` が存在する場合は必須（依存チェック） | 400 Bad Request |

---

## 確認ステップ 5-2: バックエンド処理フロー

### エンドポイント: `{METHOD} /api/v1/{path}`

```
1. 開始
2. クライアントから HTTP リクエスト（`{METHOD} /api/v1/{path}`）を受信
3. 入力バリデーションを実施
   - `{フィールド名}` が空でないこと
   - `{その他条件}` を満たしていること
4. バリデーション通過？
   - No →
      - 400 Bad Request `{ "error": "VALIDATION_ERROR" }` を返す
      - 終了
   - Yes →
      5. ビジネスロジックを実行（リクエスト内容に基づいた処理）
      6. データアクセスを実行（DB やストレージに対して操作）
      7. DB への `{INSERT / UPDATE / DELETE / SELECT}` を実行（対象テーブル: `{table_name}`）
      8. DB 操作成功？
         - No →
            - 500 Internal Server Error `{ "error": "INTERNAL_ERROR" }` を返す
            - 終了
         - Yes →
            9. DB の結果を上位の処理層に返却
            10. クライアントに {ステータスコード} + JSON を返す
            11. 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

> フロントエンド処理が不要な場合（バックエンドのみの機能）はこのセクションを削除する。

```
1. 開始
2. ユーザーが画面上で操作を行う（{トリガーアクション}）
3. 入力バリデーション（フロントエンド側）
   - {フィールド名} の形式チェック
   - {その他条件} のチェック
4. バリデーション通過？
   - No →
      - エラーメッセージを表示（インライン or トースト）
      - 終了
   - Yes →
      5. ローディング状態を表示（スケルトン / スピナー）
      6. API リクエストを送信（`{METHOD} /api/v1/{path}`）
      7. レスポンス受信
      8. HTTP ステータス判定
         - 4xx/5xx →
            - エラー UI を表示（{エラー表示方法}）
            - 終了
         - 2xx →
            9. レスポンスデータを状態に反映
            10. UI を更新（{表示内容}）
            11. 終了
```

---

## 確認ステップ 5-3: DB 操作

> DB 変更がない場合はこのセクションを削除する。

### 対象テーブル

| テーブル | 操作 | 条件 |
|---|---|---|
| `{table_name}` | INSERT / UPDATE / DELETE / SELECT | `WHERE id = ?` など |

### SQL イメージ

```sql
-- 例: INSERT
INSERT INTO {table_name} (col1, col2, created_at)
VALUES (?, ?, NOW());

-- 例: UPDATE
UPDATE {table_name}
SET col1 = ?, updated_at = NOW()
WHERE id = ? AND deleted_at IS NULL;
```

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `{METHOD} /api/v1/{path}`

### レスポンス（正常系）

- ステータス: `200 OK` / `201 Created`

```json
{
  "field": "value"
}
```

### エラーケース一覧

| 条件 | 発生レイヤー | ステータス | レスポンス |
|---|---|---|---|
| バリデーション失敗 | Handler / Service | 400 Bad Request | `{ "error": "VALIDATION_ERROR" }` |
| リソース未存在 | Service / Repository | 404 Not Found | `{ "error": "NOT_FOUND" }` |
| 未認証 | Middleware | 401 Unauthorized | `{ "error": "UNAUTHORIZED" }` |
| 権限不足 | Middleware / Service | 403 Forbidden | `{ "error": "FORBIDDEN" }` |
| 重複・競合 | Service / Repository | 409 Conflict | `{ "error": "CONFLICT" }` |
| DB / 外部サービスエラー | Repository | 500 Internal Server Error | `{ "error": "INTERNAL_ERROR" }` |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `{METHOD} /api/v1/{path}`

| # | 観点 | テスト内容 | 入力例 | 期待結果 |
|---|---|---|---|---|
| 1 | 正常系 | 正しい入力で期待レスポンスが返る | 有効なリクエスト | 200 OK / 期待 JSON |
| 2 | 異常系 | 必須フィールドが空のとき失敗する | `field_name: ""` | 400 Bad Request |
| 3 | 異常系 | 型が不正のとき失敗する | `num_field: "abc"` | 400 Bad Request |
| 4 | 境界値 | 最小値ちょうどで成功する | `value: {min}` | 200 OK |
| 5 | 境界値 | 最大値ちょうどで成功する | `value: {max}` | 200 OK |
| 6 | 境界値 | 最大値 + 1 で失敗する | `value: {max+1}` | 400 Bad Request |
| 7 | 分岐条件 | 条件 A のとき処理 X が走る | 条件 A の入力 | 期待する処理 X の結果 |
| 8 | 分岐条件 | 条件 B のとき処理 Y が走る | 条件 B の入力 | 期待する処理 Y の結果 |
| 9 | 例外処理 | DB エラー時に 500 を返す | DB モックがエラーを返す | 500 Internal Server Error |
| 10 | Null / 空 | null 入力を適切に拒否する | `field: null` | 400 Bad Request |
| 11 | Null / 空 | 空配列を適切に処理する | `list: []` | 200 OK / 400 Bad Request |
| 12 | 外部依存 | DB をモックで切り分ける | モック差し替え | 期待するモック応答 |
| 13 | 状態変化 | 登録後に DB にレコードが存在する | 有効な登録リクエスト | DB に新規レコードあり |
| 14 | 仕様ルール | 業務ルール・権限ルールを満たす | ルール境界の入力 | 仕様どおりの結果 |

---

## ファイル配置

### sample-api

| ファイル | 役割 |
|---|---|
| `sample-api/domain/{ドメイン名}.go` | Entity・エラー定義 |
| `sample-api/{ドメイン名}/service.go` | Repository interface・ビジネスロジック |
| `sample-api/internal/rest/{ドメイン名}.go` | HTTP Handler |
| `sample-api/internal/repository/mysql/{ドメイン名}.go` | MySQL 実装 |

---

## 要件

1. ...
2. ...

---

## 対象外

- ...
