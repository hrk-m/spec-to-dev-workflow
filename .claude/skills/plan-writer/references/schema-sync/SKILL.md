---
name: schema-sync
description: DB マイグレーションを読み取り、`plans/schema.md` を生成・更新する。`/plan-writer` と `/e2e-gen` の両方から利用し、shared-only タスクも扱う。
---

# /schema-sync — DB マイグレーションから `plans/schema.md` を生成・更新する

## 役割

マイグレーション SQL を読み取り、`plans/schema.md` を生成または更新する。

- **`plans/schema.md`**: テーブル定義、制約、FK、SQL イメージを一元管理する
- **各 PRD / shared doc の `確認ステップ 5-3`**: `plans/schema.md` への参照リンクのみを持つ

## 実行フロー

**Step 1: api-context を読み込む**

`.claude/skills/api-context/SKILL.md` を読み、`sample-api/CLAUDE.md` → `docs/steering/*.md` → go-clean-arch スキルの順に読み込んで migration ディレクトリと repository レイヤーのパスを確定する。

**Step 2: テンプレートを読み込む**

`.claude/skills/plan-writer/references/schema-sync/templates/schema.md` を読み、セクション構造を把握する。

**Step 3: migration ファイルを収集・読み込む**

migration ディレクトリの SQL ファイルを番号順に読み、`CREATE TABLE`、`ALTER TABLE`、FK、インデックス、`deleted_at` の有無を整理する。

**Step 4: テーブルと対象ドキュメントのマッピングを決定する**

`plans/` 配下のディレクトリを収集し、既存ディレクトリがある場合は対象の `{ドメイン名}` / `{verb-noun}` または shared doc を自動解決する。存在しない場合のみ `AskUserQuestion` で確認する。

**Step 5: 対象ドキュメントを特定する**

- 機能固有 PRD がある場合: `plans/{ドメイン名}/{verb-noun}/prd.md` を対象にする
- `/e2e-gen` から呼ばれた shared-only タスクの場合: `plans/shared/{処理名}.md` を対象にする
- feature PRD が存在しない shared-only タスクでは、**feature PRD 不在だけでエラーにしない**
- 対象ドキュメントがひとつも見つからない場合のみ警告して停止する

**Step 6: `plans/schema.md` の各セクションを生成する**

以下の優先順位で情報を組み立てる。

- migration SQL
- repository レイヤー
- `sample-api/CLAUDE.md` と steering

不明な項目は `{要確認}` とする。

**Step 7: `plans/schema.md` を書き出す**

- 存在しない場合: 新規作成する
- 存在する場合: 差分のあるセクションだけ更新する
- 手動追記は保持する

**Step 8: 対象ドキュメントの `確認ステップ 5-3` を参照リンクに更新する**

- `plans/{ドメイン名}/{verb-noun}/prd.md` の場合:

  ```markdown
  ## 確認ステップ 5-3: DB 操作

  → [plans/schema.md](../../schema.md) を参照。
  ```

- `plans/shared/{処理名}.md` の場合:

  ```markdown
  ## 確認ステップ 5-3: DB 操作

  → [plans/schema.md](../schema.md) を参照。
  ```

**Step 9: ファイル配置セクションに migration を追加する**

対象ドキュメントの `## ファイル配置` に migration ファイルがない場合のみ追記する。

```markdown
| `sample-api/db/migrate/{ファイル名}.sql` | テーブル定義・マイグレーション |
```

**Step 10: Repository コードとのドリフトを検出する**

repository レイヤーが存在する場合は、以下の差異を報告する。自動修正はしない。

- SELECT カラムと migration の不一致
- WHERE 条件と制約の不一致
- JOIN 条件と FK 定義の不一致

**Step 11: 完了を報告する**

通常の完了報告:

```
✅ schema-sync 完了

| テーブル | 状態 |
|---|---|
| groups / group_members | plans/schema.md 更新 / 変更なし |

| 対象ドキュメント | 確認ステップ 5-3 |
|---|---|
| plans/group/list-groups/prd.md | 参照リンクに更新 / 変更なし |

### Repository ドリフト
- [あり] {差異の内容}
- [なし] ドリフトなし
```

## 更新方針

- DB 定義は `plans/schema.md` に一元化する
- 対象ドキュメントの `確認ステップ 5-3` は参照リンクのみにする
- 手動追記は保持する
- drift は報告のみで、自動修正しない
