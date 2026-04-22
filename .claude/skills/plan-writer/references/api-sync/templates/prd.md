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
凡例: → は条件分岐・次ステップ、終了 はフロー終端を示す
1. 開始
2. クライアントから HTTP リクエスト（`{METHOD} /api/v1/{path}`）を受信
3. {クエリパラメータ / リクエストボディ} から {フィールド名} を取得し、{空文字 / 型 / 数値範囲 / 文字種} を確認する
   - {バリデーション失敗条件} の場合 → 400 Bad Request 終了
4. {存在確認 / 重複確認 / 権限確認} を行う
   - {対象が存在しない場合} → 404 Not Found 終了
   - {重複・競合の場合} → 409 Conflict 終了
   - DB エラーの場合 → 500 Internal Server Error 終了
5. {リソースの一覧取得 / 単件取得 / 登録 / 更新 / 削除} を行う
   - DB エラーの場合 → 500 Internal Server Error 終了
6. {ステータスコード} で {一覧と総件数 / 登録済みリソース / 空レスポンス} を返す 終了
```

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

> フロントエンド処理が不要な場合（バックエンドのみの機能）はこのセクションを削除する。

```
凡例: → は条件分岐・次ステップ、終了 はフロー終端を示す
1. 開始
2. {コンポーネント名 / フック名} でユーザーが {ボタン押下 / 入力変更 / スクロール到達 / 画面マウント} を行う
3. {ローディング状態の表示 / デバウンス待機（Nms）} を開始する
4. `{METHOD} /api/v1/{path（パラメータ込み）}` にリクエストを送信する
5. レスポンス受信
   - 失敗（4xx / 5xx）→ {エラーカード / トースト} を表示する 終了
   - 成功（2xx）→
      6. {取得データを状態に反映 / 一覧末尾にデータを追加} する
      7. {一覧表示更新 / フォームリセット / 画面遷移 / 親コンポーネントの再取得} を行う 終了
```

---

## 確認ステップ 5-3: ファイル配置

**原則: 関与した全ファイルを列挙し、役割は具体的に書く。**

### sample-api

| 対応ステップ | パス | 役割 |
| --- | --- | --- |
| 5-1, 5-2, 5-4 | `sample-api/internal/rest/{ドメイン名}.go` | HTTP Handler・Service interface・ルート登録 |
| 5-2 | `sample-api/domain/{ドメイン名}.go` | Entity・エラー定義 |
| 5-2 | `sample-api/{ドメイン名}/service.go` | Repository interface・ビジネスロジック |
| 5-3 | `sample-api/internal/repository/mysql/{ドメイン名}.go` | MySQL 実装 |
| 5-3 | `sample-api/db/migrate/{timestamp}_{description}.up.sql` | テーブル定義・マイグレーション |
| 5-5 | `sample-api/internal/rest/{ドメイン名}_test.go` | Handler ユニットテスト |
| 5-5 | `sample-api/internal/rest/mocks/{ドメイン名}_service_mock.go` | Service の手動 mock |
| 5-5 | `sample-api/{ドメイン名}/service_test.go` | Service ユニットテスト |
| 5-5 | `sample-api/{ドメイン名}/mocks/{ドメイン名}_repository_mock.go` | Repository の手動 mock |

### sample-front

| 対応ステップ | パス | 役割 |
| --- | --- | --- |
| 5-2-FE | `sample-front/src/.../{ComponentName}.tsx` | コンポーネント実装 |
| 5-2-FE | `sample-front/src/.../{ComponentName}.styles.ts` | スタイル定義 |
| 5-2-FE | `sample-front/src/.../fetch-{resource}.ts` | API クライアント |
| 5-2-FE | `sample-front/src/.../use{HookName}.ts` | カスタムフック |
| 5-5 | `sample-front/src/.../__tests__/{ComponentName}.test.tsx` | コンポーネントテスト |
| 5-5 | `e2e/tests/{feature}.spec.ts` | E2E テスト |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### エンドポイント: `{METHOD} /api/v1/{path}`

### レスポンス（正常系）

- ステータス: `200 OK` / `201 Created`

```json
{
  "{field}": "{value}"
}
```

### エラーケース一覧

| 条件 | 発生レイヤー | ステータス | レスポンス |
|---|---|---|---|
| バリデーション失敗 | Handler / Service | 400 Bad Request | `{"message": "..."}` |
| リソース未存在 | Service / Repository | 404 Not Found | `{"message": "..."}` |
| 未認証 | Middleware | 401 Unauthorized | `{"message": "..."}` |
| 権限不足 | Middleware / Service | 403 Forbidden | `{"message": "..."}` |
| 重複・競合 | Service / Repository | 409 Conflict | `{"message": "..."}` |
| DB / 外部サービスエラー | Repository | 500 Internal Server Error | `{"message": "..."}` |

---

## 確認ステップ 5-5: ユニットテストケース

### エンドポイント: `{METHOD} /api/v1/{path}`

| # | 観点 | テスト内容 | 入力例 | 期待結果 |
|---|---|---|---|---|
| 1 | 正常系 | 正しい入力で期待レスポンスが返る | 有効なリクエスト | 200 OK / 期待 JSON |
| 2 | 異常系 | 必須フィールドが空のとき失敗する | 無効な入力 | 400 Bad Request |
| 3 | 異常系 | 型が不正のとき失敗する | 無効な入力 | 400 Bad Request |
| 4 | 境界値 | 最小値ちょうどで成功する | 境界値入力 | 200 OK |
| 5 | 境界値 | 最大値ちょうどで成功する | 境界値入力 | 200 OK |
| 6 | 境界値 | 最大値 + 1 で失敗する | 境界値を超える入力 | 400 Bad Request |
| 7 | 分岐条件 | 条件 A のとき処理 X が走る | 条件 A の入力 | 期待する処理 X の結果 |
| 8 | 分岐条件 | 条件 B のとき処理 Y が走る | 条件 B の入力 | 期待する処理 Y の結果 |
| 9 | 例外処理 | DB エラー時に 500 を返す | DB モックがエラーを返す | 500 Internal Server Error |
| 10 | Null / 空 | null 入力を適切に拒否する | `field: null` | 400 Bad Request |
| 11 | Null / 空 | 空配列を適切に処理する | `list: []` | 200 OK / 400 Bad Request |
| 12 | 外部依存 | DB をモックで切り分ける | モック差し替え | 期待するモック応答 |
| 13 | 状態変化 | 登録後に DB にレコードが存在する | 有効な登録リクエスト | DB に新規レコードあり |
| 14 | 仕様ルール | 業務ルール・権限ルールを満たす | ルール境界の入力 | 仕様どおりの結果 |

---

## 要件

1. ...
2. ...

---

## 対象外

- ...
