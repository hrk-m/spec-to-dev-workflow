---
name: schema-sync
description: DB マイグレーションを読み取り、plans/schema.md を生成・更新する。ディレクトリ構造の判断は api-context に委ねる。各 prd.md の確認ステップ 5-3 は schema.md への参照リンクのみにする。
---

# /schema-sync — DB マイグレーションから plans/schema.md を生成・更新する

## 役割

マイグレーション SQL を読み取り、`plans/schema.md` を生成または更新する。

- **`plans/schema.md`**: テーブル定義（カラム・型・制約・FK）と SQL イメージを一元管理
- **`prd.md` の `確認ステップ 5-3`**: `plans/schema.md` への参照リンクのみ

---

## 用語

| 用語 | 意味 |
|---|---|
| `{機能名}` | `plans/` 配下のディレクトリ名（例: `group`） |
| `{verb-noun}` | API 操作単位の名前（例: `list-groups`） |
| migration ファイル | `sample-api/db/migrations/*.sql` |

---

## 実行フロー

**Step 1: api-context を読み込む**
`.claude/skills/api-context/SKILL.md` を読み、`sample-api/CLAUDE.md` → `docs/steering/*.md` → go-clean-arch スキルの順に読み込んで migration ディレクトリと repository レイヤーのパスを確定する。

**Step 2: テンプレートを読み込む**
`.claude/skills/plan-writer/references/schema-sync/templates/schema.md` を読み、セクション構造を把握する。

**Step 3: migration ファイルを収集・読み込む**
Step 1 で確定した migration ディレクトリの SQL ファイルを番号順に読み込む。読み取る内容: `CREATE TABLE` / `ALTER TABLE`・FK・インデックス・`deleted_at` の有無。

**Step 4: テーブルと `{機能名}` のマッピングを決定する**

`plans/` 配下のディレクトリを `Glob` で収集し、以下で分岐する。

- **既存ディレクトリが存在する場合**: ディレクトリ名からマッピングを自動解決する（AskUserQuestion 不要）
- **存在しない場合**: テーブル名を単数形にして `{機能名}` を推定し、`AskUserQuestion` で確認する

**Step 5: 対応する prd.md を特定する**
確定したマッピングをもとに `plans/{機能名}/` 配下の `prd.md` を Glob で列挙する。存在しない場合は警告を出し `/spec-update → plans-sync` を案内してスキップする。

**Step 6: `plans/schema.md` の各セクションを生成する**

テンプレートのセクション構造に従って埋める。データソースは以下の優先順位で参照する。

- **migration SQL**: テーブル定義・カラム・FK・インデックス・`deleted_at` の有無
- **repository レイヤー**: ユースケース・更新ポリシー（INSERT / UPDATE / DELETE）
- **`sample-api/CLAUDE.md` + steering**: 概要・ドキュメント管理
- 不明な項目は `{要確認}` とする

**Step 7: `plans/schema.md` を書き出す**
- 存在しない場合: `Write` で新規作成（テンプレートのセクション順に従う）
- 存在する場合: `Read` で既存内容を読み、差分があるセクションのみ `Edit` で更新。手動追記は保持する。

**Step 8: 各 prd.md の `確認ステップ 5-3` を参照リンクに更新する**
```markdown
## 確認ステップ 5-3: DB 操作

→ [plans/schema.md#{機能名}--{verb-noun}](../../schema.md#{anchor}) を参照。
```
すでに参照リンク形式の場合はスキップ。他のセクションは触らない。

**Step 9: ファイル配置セクションに migration を追加する**
`prd.md` の `## ファイル配置` に migration ファイルの行がない場合、`Edit` で追記する。
```markdown
| `sample-api/db/migrations/{ファイル名}.sql` | テーブル定義・マイグレーション |
```

**Step 10: Repository コードとのドリフトを検出する**
repository レイヤーのファイルが存在する場合、以下を比較して差異を報告する（自動修正はしない）。

| 比較対象 | 確認内容 |
|---|---|
| Repository の SELECT カラム | migration のカラム定義と一致しているか |
| Repository の WHERE 条件 | `deleted_at IS NULL` など migration の制約と整合しているか |
| Repository の JOIN 条件 | FK 定義と一致しているか |

差異がある場合:
```
⚠️ ドリフト検出
- [DB-1] groups.{カラム名} が migration に存在するが Repository の SELECT に含まれていない
```

**Step 11: 完了を報告する**
```
✅ schema-sync 完了

| テーブル | 状態 |
|---|---|
| groups / group_members | plans/schema.md 更新 / 変更なし |

| prd.md | 確認ステップ 5-3 |
|---|---|
| plans/group/list-groups/prd.md | 参照リンクに更新 / 変更なし |

### Repository ドリフト
- [あり] {差異の内容}
- [なし] ドリフトなし

### 次のステップ
- 内容を確認して問題なければ `/impl` を実行してください
- ドリフトがある場合は Repository コードを確認・修正してください
```

---

## 更新方針

- **schema.md に一元化**: DB のテーブル定義はすべて `plans/schema.md` で管理する
- **prd.md は参照リンクのみ**: `確認ステップ 5-3` は参照リンクのみにする
- **手動追記の保持**: `plans/schema.md` の手書きコメント・補足は保持する
- **ドリフトの自動修正禁止**: 差異は報告のみ。修正はユーザーが判断する

---

## ツール案内

- `Glob` / `Read`: migration ファイル・Repository コードの読み取り
- `Edit`: prd.md の `確認ステップ 5-3` と `ファイル配置` の更新
- `AskUserQuestion`: 新規のテーブルで `plans/` に対応ディレクトリが存在しない場合のみ、マッピング確認に使用
