---
name: skill-link
description: "api-context / front-context からサービスのスキルを調査し、選択したものを references/ にシンボリックリンクで繋ぐ。スキルをリンクしたい・登録したい・シンボリックリンクを作りたいときに使う。"
allowed-tools: Bash, Read, AskUserQuestion
---

# Skill Link

## 手順

1. Read ツールで以下の agent ファイルを読み込み、frontmatter の `skills:` フィールドからスキル一覧（名前とパス）を収集する:
   - `.claude/agents/sample-api-agent.md`
   - `.claude/agents/sample-front-agent.md`

2. **sample-api-agent のスキルをリンクする**

   `sample-api/.claude/skills/` 配下のスキル一覧を収集し、現在 `.claude/skills/api-context/references/` に存在するシンボリックリンクを確認する。

   `AskUserQuestion(multiSelect: true)` でリンクするスキルをユーザーに選ばせる（既存リンクはデフォルト選択済みとして表示する）。

   - **選択された**スキルのうち、リンクが存在しない場合は作成する:
     ```bash
     ln -s "<リポジトリルート>/sample-api/.claude/skills/<name>" "$(pwd)/.claude/skills/api-context/references/<name>"
     ```
   - **選択されなかった**スキルのうち、リンクが存在する場合は削除する:
     ```bash
     rm "$(pwd)/.claude/skills/api-context/references/<name>"
     ```

   シンボリックリンクの追加・削除後、`.claude/skills/api-context/SKILL.md` を更新する（手順 4 参照）。

3. **sample-front-agent のスキルをリンクする**

   `sample-front/.claude/skills/` 配下のスキル一覧を収集し、現在 `.claude/skills/front-context/references/` に存在するシンボリックリンクを確認する。

   `AskUserQuestion(multiSelect: true)` でリンクするスキルをユーザーに選ばせる（既存リンクはデフォルト選択済みとして表示する）。

   - **選択された**スキルのうち、リンクが存在しない場合は作成する:
     ```bash
     ln -s "<リポジトリルート>/sample-front/.claude/skills/<name>" "$(pwd)/.claude/skills/front-context/references/<name>"
     ```
   - **選択されなかった**スキルのうち、リンクが存在する場合は削除する:
     ```bash
     rm "$(pwd)/.claude/skills/front-context/references/<name>"
     ```

   シンボリックリンクの追加・削除後、`.claude/skills/front-context/SKILL.md` を更新する（手順 4 参照）。

4. **context SKILL.md を同期する**

   手順 2・3 で変化があったスキルについて、対応する context SKILL.md（`api-context/SKILL.md` または `front-context/SKILL.md`）を以下のルールで更新する。

   各スキルの `description` は対象スキルの `SKILL.md` frontmatter の `description` フィールドから Read して取得すること。

   **追加時（リンク新規作成）**:
   - 「使用スキル」テーブルに行を追加する:
     ```
     | `<name>` | <description（1行目を抜粋）> | `<service>/.claude/skills/<name>/SKILL.md` |
     ```
   - ファイル末尾に以下のセクションを追加する:
     ```markdown
     ---

     ## <スキル表示名> スキル

     Read ツールで `.claude/skills/<context>/references/<name>/SKILL.md` を読み込むこと。
     ```

   **削除時（リンク削除）**:
   - 「使用スキル」テーブルから該当行を削除する
   - 該当スキルのセクション（`## <スキル名> スキル` から次の `---` または EOF まで）を削除する

選択状態に変化がなかったスキルはスキップして報告する。
