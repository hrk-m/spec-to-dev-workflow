---
name: impl-done
description: >
  `/e2e-gen` 完了後に実行する最終ゲート後半。
  変更対象の `sample-api-agent` / `sample-front-agent` に `docs/steering/` の同期を委譲し、
  続けて `spec-knowledge` と `spec-screenshot` を順番に実行して `specs/` を同期する。
  `plans/` は更新しない。
---

# /impl-done — 最終ドキュメント同期

`/e2e-gen` が完了した後に、`docs/steering/` と `specs/` を現在の実装へ同期する。

開始条件・停止条件・戻り先・完了条件の正本は `AGENTS.md` と `.claude/rules/workflow.md` とし、このスキルはそこから逸脱しない。

## 前提

- `/arch-refactor` が完了している
- `/e2e-gen` が `E2E COMPLETE` を出力している
- `plans/` の最終同期が済んでいる
- 実装を締める段階である

## 実行手順

### Step 1: steering 同期（並列）

変更対象に含まれる `sample-api-agent` / `sample-front-agent` を起動し、各サービスの `docs/steering/` を現在の実装に同期させる。
両方が変更対象の場合は同時に実行する。

**sample-api-agent への指示**

```
/steering を実行して docs/steering/ を現在の実装に同期してください。
```

**sample-front-agent への指示**

```
/steering を実行して docs/steering/ を現在の実装に同期してください。
```

### Step 2: spec 同期（順番に実行）

1. `.claude/skills/spec-update/references/spec-knowledge/SKILL.md` を Read し、手順に従って `specs/` を生成・同期する
2. `.claude/skills/spec-update/references/spec-screenshot/SKILL.md` を Read し、手順に従って画面セクションへスクリーンショットを埋め込む

`specs/` は repo 全体の成果物なので、複数エージェントに同時に触らせない。

### Step 3: `plans/` は更新しない

`plans/` の最終同期は `/e2e-gen` 側で完了している前提とし、このスキルでは更新しない。

## 完了報告

```text
## impl-done 完了

### steering 同期
- sample-api/docs/steering/: [変更したファイル]
- sample-front/docs/steering/: [変更したファイル]

### spec 同期
- spec-knowledge: [更新したファイル]
- spec-screenshot: [更新したファイル]
```
