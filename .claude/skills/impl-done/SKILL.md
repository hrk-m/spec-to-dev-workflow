---
name: impl-done
description: >
  `/impl` による実装・修正が全て完了した後に実行するポスト実装スキル。
  `sample-api-agent` と `sample-front-agent` を使って各サービスの steering ドキュメント
  (`docs/steering/`) を最新の実装に同期し、完了後に `spec-knowledge` と `spec-screenshot` の
  両方を自動実行して `specs/` も同期する。
  「実装が終わった」「impl-done を実行して」「steering を更新して」「ドキュメントを同期して」
  などのトリガーで起動する。`/impl` の完了後に必ず使用すること。
---

# impl-done — ポスト実装ドキュメント同期

`/impl` で実装・修正が完了した後、コードと各種ドキュメントの乖離をなくすために実行する。

## 実行フロー

### Step 1: steering 同期（並列）

`sample-api-agent` と `sample-front-agent` を **同時に** 起動し、各サービスの `/steering` スキルを Sync モードで実行させる。

**sample-api-agent への指示**:

```
/steering を実行して docs/steering/ を現在の実装に同期してください。
```

**sample-front-agent への指示**:

```
/steering を実行して docs/steering/ を現在の実装に同期してください。
```

### Step 2: spec 同期（両方自動実行）

`sample-api-agent` と `sample-front-agent` を **同時に** 起動し、以下の 2 つを **順番に** 実行する（AskUserQuestion は出さない）。

1. Read ツールで `.claude/skills/spec-update/references/spec-knowledge/SKILL.md` を読み込み、手順に従って `specs/` を生成・同期する。
2. Read ツールで `.claude/skills/spec-update/references/spec-screenshot/SKILL.md` を読み込み、手順に従って画面セクションにスクリーンショットを埋め込む。

## 完了報告フォーマット

```
## impl-done 完了

### steering 同期
- sample-api/docs/steering/: [変更したファイルと内容]
- sample-front/docs/steering/: [変更したファイルと内容]

### spec 同期（spec-knowledge）
- [更新した specs/ のファイルと内容]

### spec 同期（spec-screenshot）
- [埋め込んだスクリーンショットと対象セクション]
```
