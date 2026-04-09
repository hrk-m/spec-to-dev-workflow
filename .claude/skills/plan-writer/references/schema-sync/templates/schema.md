# Schema

## 概要

| 項目 | 内容 |
|---|---|
| システム名 | {システム名} |
| 目的・用途 | {何のシステム用のデータベースか} |
| RDBMS | {MySQL / PostgreSQL など} |
| バージョン | {バージョン番号} |
| ドキュメント種別 | 手書き / 自動生成（`{コマンド例}`） |
| 最終更新日 | {YYYY-MM-DD} |

---

## テーブル一覧

| テーブル名 | 概要 | 集約単位 |
|---|---|---|
| `{table_name}` | {このテーブルが表すもの} | {ビジネス単位。例: グループ集約のルート} |

---

## テーブル定義

<!--
テーブルごとにこのセクションを繰り返す。
-->

### `{table_name}`

**概要**: {このテーブルが表すビジネスデータの説明}

**集約単位**: {このテーブルが属する集約。例: グループ集約のルートエンティティ}

#### カラム

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` | NOT NULL | AUTO_INCREMENT | {主キー。何の識別子か} |
| `{column}` | `{type}` | NOT NULL / NULL | {値 / なし} | {このカラムが業務上何を意味するか} |

#### 制約

| 種別 | 名前 | 対象カラム | 説明 |
|---|---|---|---|
| PRIMARY KEY | `PRIMARY` | `id` | {説明} |
| UNIQUE | `{constraint_name}` | `{column}` | {説明} |
| FOREIGN KEY | `{constraint_name}` | `{column}` → `{ref_table}({ref_col})` | {説明} |

#### インデックス

| インデックス名 | 対象カラム | 種別 | 用途 |
|---|---|---|---|
| `PRIMARY` | `id` | PRIMARY | {説明} |
| `{index_name}` | `{column}` | UNIQUE / INDEX | {クエリ高速化の目的など} |

---

## 暗黙のルール

### 論理削除ポリシー

- `deleted_at` カラム（`DATETIME NULL`）を持つテーブルはソフトデリート運用
- 有効レコードの取得条件: `WHERE deleted_at IS NULL`
- 物理削除は原則禁止。{例外がある場合は記載}

### その他の暗黙ルール

- {例: created_at / updated_at は全テーブルに存在する}
- {例: 文字コードは utf8mb4、照合順序は utf8mb4_unicode_ci}
- {例: タイムゾーンは UTC で保存}

---

## データのライフサイクル・保存期間

| テーブル | 保存期間 | 削除方針 |
|---|---|---|
| `{table_name}` | {無期限 / {N}日 / {N}ヶ月} | {論理削除 / バッチ物理削除 / 自動 TTL} |

---

## データのソース・ユースケース

| テーブル | データソース | 主なユースケース |
|---|---|---|
| `{table_name}` | {ユーザー入力 / 外部 API / バッチ連携 など} | {どの機能・画面・API が参照・更新するか} |

---

## 更新ポリシー

| テーブル | 更新方式 | 備考 |
|---|---|---|
| `{table_name}` | オンライン（API 経由） / バッチ | {補足} |

---

## マイグレーション

| 項目 | 内容 |
|---|---|
| ツール | `{golang-migrate}` |
| ファイル置き場 | `{sample-api/db/migrate/}` |
| ファイル命名規則 | `{YYYYMMDDHHMMSS_動詞_対象テーブル.up.sql}` （例: `20260403120000_create_groups.up.sql`） |
| 適用コマンド | `{make db-migrate}` |
| リセットコマンド | `{make db-reset}`（開発環境限定・`APP_ENV=development` が必要） |

### マイグレーションファイル一覧

| ファイル | 内容 |
|---|---|
| `{YYYYMMDDHHMMSS_name.up.sql}` | {このマイグレーションで行う変更の概要} |

---

## テーブル間の関連

```mermaid
erDiagram
    {table_a} {
        BIGINT_UNSIGNED id PK
        VARCHAR name
    }
    {table_b} {
        BIGINT_UNSIGNED id PK
        BIGINT_UNSIGNED {fk_column} FK
        VARCHAR name
    }
    {table_a} ||--o{ {table_b} : "has"
```

---

## ドキュメント管理

| 項目 | 内容 |
|---|---|
| 管理方法 | 手書き / 自動生成 |
| 自動生成ツール | {tbls / SchemaSpy / schemaspy など。なければ「なし」} |
| 自動生成コマンド | `{コマンド例}` |
| スクリプト置き場 | `{scripts/generate-schema-doc.sh}` など |
| 更新ルール | {マイグレーション追加時に手動更新 / CI で自動更新 など} |
