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

   `sample-api/.claude/skills/` 配下のスキル一覧を収集し、`AskUserQuestion(multiSelect: true)` でリンクするスキルをユーザーに選ばせる。

   選択されたスキルについて `.claude/skills/api-context/references/<name>` にシンボリックリンクを作成する:

   ```bash
   ln -s "<リポジトリルート>/sample-api/.claude/skills/<name>" "$(pwd)/.claude/skills/api-context/references/<name>"
   ```

3. **sample-front-agent のスキルをリンクする**

   `sample-front/.claude/skills/` 配下のスキル一覧を収集し、`AskUserQuestion(multiSelect: true)` でリンクするスキルをユーザーに選ばせる。

   選択されたスキルについて `.claude/skills/front-context/references/<name>` にシンボリックリンクを作成する:

   ```bash
   ln -s "<リポジトリルート>/sample-front/.claude/skills/<name>" "$(pwd)/.claude/skills/front-context/references/<name>"
   ```

既に同名のエントリが存在する場合はスキップして報告する。
