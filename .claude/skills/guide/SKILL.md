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

| # | スキル | タイミング |
|---|--------|-----------|
| 1 | `plan` | **新機能の開発を始める前**。何を・なぜ・どう作るかをユーザーと合意する |
| 2 | `plan-writer` | **`/plan` で要件が固まった後**。合意内容を `plans/tasks/{タスク名}/prd.md` に書き出す |
| 3 | `plan-checker` | **`/impl` の前に PRD を検証したいとき**。アーキテクチャ規約との整合性を確認する |
| 4 | `impl` | **PRD が存在するとき**。TDD で実装する。バックエンド / フロントエンドのエージェントに委譲 |
| 5 | `impl-done` | **`/impl` が完了した後**。steering と specs/ をコードに同期する |
| 6 | `api-context` | **バックエンドの実装前**（主にエージェントが自動ロード）。Go Clean Architecture の規約を確認する |
| 7 | `front-context` | **フロントエンドの実装前**（主にエージェントが自動ロード）。FSD v2.1 の規約を確認する |
| 8 | `skill-link` | **新しいスキルを api-context / front-context に登録したいとき** |
| 9 | `spec-update` | **実装後に仕様書を最新化したいとき** |

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

2. 選択に応じて返信候補をチャットに提示する。

   > **重要**: 以下のスキルは Skill ツールを呼ばず、返信候補のテキストをチャットに提示するだけにする。
   > `plan` / `plan-writer` / `plan-checker` / `impl` / `impl-done` / `api-context` / `front-context`

   ### plan-writer / plan-checker / impl / impl-done の前作業チェック

   `plan-writer` / `plan-checker` / `impl` / `impl-done` が選択された場合は、返信前に **前のステップが完了しているか** を確認する。

   完了判定の基準:

   | 選択スキル | 前ステップ | 完了の証拠 |
   |-----------|-----------|-----------|
   | `plan-writer` | `/plan` | `plans/tasks/` 配下にディレクトリまたはメモが存在する、もしくは会話内で要件合意が取れている |
   | `plan-checker` | `/plan-writer` | `plans/tasks/{タスク名}/prd.md` が存在する |
   | `impl` | `/plan-writer`（`/plan-checker` は任意） | `plans/tasks/{タスク名}/prd.md` が存在する |
   | `impl-done` | `/impl` | 実装ファイルへの変更が git 差分として存在する、またはテストがパスしている |

   - **前ステップ完了の場合**: `次のステップは /〇〇 を実行してください。` と返信する
   - **前ステップ未完了の場合**: 以下のフローをチャットに共有して案内する

   ```
   /plan → /plan-writer → /plan-checker（任意）→ /impl → /impl-done
   ```

   ### 返信候補一覧

   | 選択 | 返信候補 | 動作 |
   |------|---------|------|
   | `plan` | `次のステップは /plan '要件を入力してください' を実行してください。` | 返信のみ |
   | `plan-writer` | 前作業チェック後に `次のステップは /plan-writer を実行してください。` | 返信のみ |
   | `plan-checker` | 前作業チェック後に `次のステップは /plan-checker を実行してください。` | 返信のみ |
   | `impl` | 前作業チェック後に `次のステップは /impl を実行してください。` | 返信のみ |
   | `impl-done` | 前作業チェック後に `次のステップは /impl-done を実行してください。` | 返信のみ |
   | `api-context` | `次のステップは /api-context を実行してください。` | 返信のみ |
   | `front-context` | `次のステップは /front-context を実行してください。` | 返信のみ |
   | `skill-link` | `api / front のスキルを繋げる` | `.claude/skills/skill-link/SKILL.md` を Read して実行 |
   | `spec-update` | （返信候補なし） | `.claude/skills/spec-update/SKILL.md` を Read して実行 |
