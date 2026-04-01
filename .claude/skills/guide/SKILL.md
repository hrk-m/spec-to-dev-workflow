---
name: guide
description: >
  このプロジェクトのスキル一覧とワークフローを案内する。
  「何をすればいいか分からない」「どのスキルを使えばいいか」「ガイドを見たい」
  「スキル一覧を見せて」などのトリガーで起動する。
  AskUserQuestion で実行したいスキルを選ばせ、そのスキルの手順を実行する。
allowed-tools: Read, AskUserQuestion
---

# プロジェクトスキルガイド

このプロジェクトのスキル一覧とワークフローを案内する。

---

## ワークフロー全体像

```
新機能を作るとき:
  /plan → /plan-writer → /plan-checker（任意）→ /impl → /impl-done

スキルの管理:
  /skill-link  — サービスのスキルを api-context / front-context にリンクする

仕様の管理:
  /spec-update — specs/ を最新の実装に同期する
```

---

## スキル一覧

| スキル | タイミング |
|--------|-----------|
| `plan` | **新機能の開発を始める前**。何を・なぜ・どう作るかをユーザーと合意する |
| `plan-writer` | **`/plan` で要件が固まった後**。合意内容を `plans/tasks/{タスク名}/prd.md` に書き出す |
| `plan-checker` | **`/impl` の前に PRD を検証したいとき**。アーキテクチャ規約との整合性を確認する |
| `impl` | **PRD が存在するとき**。TDD で実装する。バックエンド / フロントエンドのエージェントに委譲 |
| `impl-done` | **`/impl` が完了した後**。steering と specs/ をコードに同期する |
| `api-context` | **バックエンドの実装前**（主にエージェントが自動ロード）。Go Clean Architecture の規約を確認する |
| `front-context` | **フロントエンドの実装前**（主にエージェントが自動ロード）。FSD v2.1 の規約を確認する |
| `skill-link` | **新しいスキルを api-context / front-context に登録したいとき** |
| `spec-update` | **実装後に仕様書を最新化したいとき** |

---

## 手順

1. `AskUserQuestion` で実行したいスキルをユーザーに選ばせる:

   - **質問**: どのスキルを実行しますか？
   - **選択肢**（単一選択）:
     1. `plan` — 新機能の要件を対話しながら決める
     2. `plan-writer` — 合意済みの要件を PRD ファイルに書き出す
     3. `plan-checker` — PRD をアーキテクチャ規約でチェックする
     4. `impl` — PRD をもとに TDD で実装する
     5. `impl-done` — 実装完了後に steering と specs を同期する
     6. `api-context` — バックエンドの実装規約を確認する
     7. `front-context` — フロントエンドの実装規約を確認する
     8. `skill-link` — スキルを api-context / front-context にリンクする
     9. `spec-update` — specs/ を最新の実装に同期する

2. 選択に応じて対応するスキルの SKILL.md を Read し、その手順に従って実行する:

   | 選択 | 読み込むパス |
   |------|------------|
   | `plan` | `.claude/skills/plan/SKILL.md` |
   | `plan-writer` | `.claude/skills/plan-writer/SKILL.md` |
   | `plan-checker` | `.claude/skills/plan-checker/SKILL.md` |
   | `impl` | `.claude/skills/impl/SKILL.md` |
   | `impl-done` | `.claude/skills/impl-done/SKILL.md` |
   | `api-context` | `.claude/skills/api-context/SKILL.md` |
   | `front-context` | `.claude/skills/front-context/SKILL.md` |
   | `skill-link` | `.claude/skills/skill-link/SKILL.md` |
   | `spec-update` | `.claude/skills/spec-update/SKILL.md` |
