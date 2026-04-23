---
name: guide
description: >
  ワークフローや実行順が不明なときに、修正サイクル・最終ゲート・`/spec-update` 系の境界を案内し、次に実行すべきスキルを提示する。
allowed-tools: Read, AskUserQuestion
---

# プロジェクトスキルガイド

このプロジェクトのスキル一覧とワークフローを案内する。
ワークフローの正本は `AGENTS.md` と `.claude/rules/workflow.md` であり、このガイドはその入口案内だけを担当する。

---

## ワークフロー全体像

```
開始:
  設計変更あり・新機能・バグ修正 / PRD 未整備の純粋バグ修正
    → /plan

  PRD 既存かつ必要な計画が揃っている純粋バグ修正・リファクタリング
    → /impl から開始してよい
    ※ /impl から開始した場合も、plans の最終同期・必要に応じた更新は /e2e-gen で行う

通常の修正サイクル:
  [修正サイクル（何度でも繰り返す）]
  /plan → /plan-writer → /plan-checker（任意）→ /impl → /arch-refactor

  [最終ゲート]
  /e2e-gen → /impl-done

スキルの管理:
  /skill-link — サービスのスキルを api-context / front-context にリンクする

例外・補助ルート:
  /spec-update → plans-sync
  /spec-update → spec-knowledge
  /spec-update → spec-screenshot
```

## 用語

- **修正サイクル**: `/plan → /plan-writer → /plan-checker（任意）→ /impl → /arch-refactor` を 1 周する単位
- **収束**: `/arch-refactor` が REVIEWED を出力した時点。修正サイクルを抜け `/e2e-gen` へ進む
- **最終ゲート**: REVIEWED 後に実行する `/e2e-gen → /impl-done`。`/e2e-gen` から `/plan` または `/impl` に戻った場合は、`/arch-refactor` が再び REVIEWED になるまで修正サイクルを完走してから再入する

---

## スキル一覧

| # | スキル | タイミング |
|---|--------|-----------|
| 1 | `plan` | **新機能の開発を始める前、PRD 未整備の純粋バグ修正に着手する前、または要件・設計を見直すとき**。何を・なぜ・どう作るかをユーザーと合意する |
| 2 | `plan-writer` | **`/plan` で要件が固まった後**。合意内容を `plans/{ドメイン名}/{verb-noun}/prd.md` または `plans/shared/{処理名}.md` に書き出し、必要に応じて `plans/schema.md` も初期同期したうえで機械的な一次整合チェックまで行う |
| 3 | `plan-checker` | **高リスク変更・判断が分かれる差分・PRD 手動修正があるときに `/impl` の前で最終確認したいとき**。一次チェックの漏れや、ユーザー確認が必要な差分を拾う |
| 4 | `impl` | **通常は `/plan-writer` 後**。例外として、PRD 既存かつ必要な計画が揃っている純粋バグ修正・リファクタリングではショートカットして TDD 実装に入る |
| 5 | `arch-refactor` | **`/impl` 完了後の修正サイクル内**。スキルを絶対的な正としてアーキテクチャ違反を検出・自動修正する |
| 6 | `e2e-gen` | **すべての修正サイクルが収束した後・`/impl-done` 前**。`plans/` を最終同期したうえで E2E テストを生成・追加し、総合動作を検証する |
| 7 | `impl-done` | **`/e2e-gen` が完了した後**。steering と specs/ を最終同期する |
| 8 | `api-context` | **バックエンドの実装前**（主にエージェントが自動ロード）。Go Clean Architecture の規約を確認する |
| 9 | `front-context` | **フロントエンドの実装前**（主にエージェントが自動ロード）。FSD v2.1 の規約を確認する |
| 10 | `skill-link` | **新しいスキルを api-context / front-context に登録したいとき** |
| 11 | `spec-update` | **通常フロー外で docs だけを直したいとき**。`plans-sync` は `plans/` の例外回復、`spec-knowledge` / `spec-screenshot` は `specs/` の手動再同期に限定して使う |
| 12 | `git-ops` | **ブランチ作成またはコミット・PR 作成・サブモジュール更新**。3 リポジトリ横断の git 操作を一括処理する |

---

## 手順

1. `AskUserQuestion` で実行したいスキルをユーザーに選ばせる:

   - **質問**: どのスキルを実行しますか？
   - **選択肢**（単一選択）:
     1. `plan` — 新機能の要件を対話しながら決める
     2. `plan-writer` — 合意済みの要件を PRD ファイルに書き出し、一次の自動整合チェックを行う
     3. `plan-checker` — PRD を最終チェックし、漏れや判断が分かれる差分を確認する
     4. `impl` — PRD をもとに TDD で実装する（既存 PRD がある純粋バグ修正・リファクタリングはここから開始可）
     5. `arch-refactor` — impl 完了後にアーキテクチャ規約への適合をチェック・自動修正する
     6. `e2e-gen` — plans を最終同期したうえで、収束後の最終ゲート前半として E2E テストを生成・追加する
     7. `impl-done` — e2e-gen 完了後に steering と specs を最終同期する
     8. `api-context` — バックエンドの実装規約を確認する
     9. `front-context` — フロントエンドの実装規約を確認する
     10. `skill-link` — スキルを api-context / front-context にリンクする
     11. `spec-update` — docs の例外・補助更新を行う
     12. `git-ops` — A: ブランチ作成 + コミット + プッシュ / B: PR 作成 + サブモジュール更新 を 3 リポジトリ横断で処理する

2. 選択に応じて返信候補をチャットに提示する。

   > **重要**: 以下のスキルは Skill ツールを呼ばず、返信候補のテキストをチャットに提示するだけにする。
   > `plan` / `plan-writer` / `plan-checker` / `impl` / `arch-refactor` / `e2e-gen` / `impl-done` / `api-context` / `front-context`

   ### plan-writer / plan-checker / impl / arch-refactor / e2e-gen / impl-done の前作業チェック

   `plan-writer` / `plan-checker` / `impl` / `arch-refactor` / `e2e-gen` / `impl-done` が選択された場合は、返信前に **前のステップが完了しているか** を確認する。

   完了判定の基準:

   | 選択スキル | 前ステップ | 完了の証拠 |
   |-----------|-----------|-----------|
   | `plan-writer` | `/plan` | 会話内で `/plan` の完了結果が確認できる、またはユーザーが `/plan` 済みと明示している |
   | `plan-checker` | `/plan-writer` | `plans/{ドメイン名}/{verb-noun}/prd.md` または `plans/shared/{処理名}.md` が存在する |
   | `impl` | `/plan-writer`（`/plan-checker` は任意）またはショートカット開始 | `plans/{ドメイン名}/{verb-noun}/prd.md` または `plans/shared/{処理名}.md` が存在する。ショートカット開始は「設計変更を伴わない純粋なバグ修正・リファクタリングで、対象機能の PRD が既存かつ必要な計画が既に揃っている」場合に限る |
   | `arch-refactor` | `/impl` | IMPL COMPLETE を出力している |
   | `e2e-gen` | `/arch-refactor` | arch-refactor が REVIEWED を出力している |
   | `impl-done` | `/e2e-gen` | e2e-gen が E2E COMPLETE を出力し、`make e2e` が全 pass している |

   - **前ステップ完了の場合**: `次のステップは /〇〇 を実行してください。` と返信する
   - **前ステップ未完了の場合**: 以下のフローをチャットに共有して案内する

   ```
   [開始]
   設計変更あり・新機能・バグ修正 / PRD 未整備の純粋バグ修正 → /plan
   PRD 既存かつ必要な計画が揃っている純粋バグ修正・リファクタリング → /impl から開始可

   [修正サイクル（何度でも繰り返す）]
   /plan → /plan-writer → /plan-checker（任意）→ /impl → /arch-refactor

   [全実装完了後の最終ゲート]
   /e2e-gen → /impl-done
   ```

   ### 返信候補一覧

   > **重要**: `plan` が選択された場合は前作業チェックを行わず、必ず `次のステップは /plan '要件を入力してください' を実行してください。` とだけ返信する。

   | 選択 | 返信候補 | 動作 |
   |------|---------|------|
   | `plan` | `次のステップは /plan '要件を入力してください' を実行してください。` | 返信のみ（前作業チェック不要） |
   | `plan-writer` | 前作業チェック後に `次のステップは /plan-writer を実行してください。` | 返信のみ |
   | `plan-checker` | 前作業チェック後に `次のステップは /plan-checker を実行してください。` | 返信のみ |
   | `impl` | 前作業チェック後に `次のステップは /impl を実行してください。` | 返信のみ |
   | `arch-refactor` | 前作業チェック後に `次のステップは /arch-refactor を実行してください。` | 返信のみ |
   | `e2e-gen` | 前作業チェック後に `次のステップは /e2e-gen を実行してください。` | 返信のみ |
   | `impl-done` | 前作業チェック後に `次のステップは /impl-done を実行してください。` | 返信のみ |
   | `api-context` | `次のステップは /api-context を実行してください。` | 返信のみ |
   | `front-context` | `次のステップは /front-context を実行してください。` | 返信のみ |
   | `skill-link` | `api / front のスキルを繋げる` | `.claude/skills/skill-link/SKILL.md` を Read して実行 |
   | `spec-update` | （返信候補なし） | `.claude/skills/spec-update/SKILL.md` を Read して実行 |
   | `git-ops` | （返信候補なし） | `.claude/skills/git-ops/SKILL.md` を Read して実行 |
