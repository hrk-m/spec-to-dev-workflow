---
name: impl
description: >
  `plans/tasks/{タスク名}/prd.md` を参照して TDD で実装する。
  `/impl` または「実装して」「実装を開始」などのトリガーで起動。
  バックエンドは `sample-api-agent`、フロントエンドは `sample-front-agent` に委譲する。
  `/plan` や `/plan-writer` で要件が確定した後に使用する。
---

# /impl — タスク実装コマンド

`plans/tasks/{タスク名}/prd.md` の要件に従い、TDD サイクルで実装する。

## いつ使うか

- `/plan` と `/plan-writer` で要件が確定し、`plans/tasks/{タスク名}/prd.md` が存在する場合
- 「実装して」「コードを書いて」「impl を実行して」などの指示があった場合

---

## 1. タスク名の特定

`plans/tasks/` 配下のディレクトリを列挙し、`AskUserQuestion` でどのタスクを実装するか選択させる。
ユーザーがタスク名を明示している場合はそのまま使用する。

---

## 2. 事前チェック

`plans/tasks/{タスク名}/prd.md` が存在しない場合は以下を案内して停止する:

```
plans/tasks/{タスク名}/prd.md が見つかりません。
先に /plan → /plan-writer を実行して要件を確定してください。
```

---

## 3. PRD 読込と実装対象の確定

`plans/tasks/{タスク名}/prd.md` を読み、以下を整理する:

| 項目 | 確認内容 |
|---|---|
| 対象システム | バックエンドのみ / フロントエンドのみ / 両方 |
| API 仕様 | エンドポイント・リクエスト・レスポンス・エラーケース |
| 処理フロー | バックエンド・フロントエンドそれぞれの処理ステップ |
| 実装方針 | 追加・変更するファイル一覧 |

---

## 4. ralph-loop の起動

`/ralph-loop:ralph-loop` を使い、**現在のセッション（オーケストレーター自身）** をループさせる。
ループの各イテレーションで、サブエージェントへの委譲・検証・修正依頼・要件充足チェックをすべて行う。

### ステップ 4-1: ループプロンプトファイルの書き出し

Write ツールで `plans/tasks/{タスク名}/.ralph-impl.md` に以下の内容を書き出す（{タスク名} と {prd セクション} は実際の内容に置換）：

```
Implement task {タスク名} following plans/tasks/{タスク名}/prd.md. Skip completed steps, resume from failed ones.

Step 1: Delegate implementation in parallel.
Run sample-api-agent for backend and sample-front-agent for frontend simultaneously.
Each agent must run tests, lint, and build after implementation and report results.

Backend agent instructions (sample-api-agent):
Implement in sample-api/ using TDD (RED->GREEN->REFACTOR).
{prd のバックエンド関連セクション（英語または日本語）}

Frontend agent instructions (sample-front-agent):
Implement in sample-front/ using TDD (RED->GREEN->REFACTOR).
{prd のフロントエンド関連セクション（英語または日本語）}

Step 2: Validation gate.
If any test/lint/build fails -> ask the agent to fix it.
If all pass -> proceed to Step 2.5.

Step 2.5: Skill compliance check against architecture patterns.

Backend compliance (run this sequence):
1. Read .claude/skills/api-context/SKILL.md
2. Read sample-api/.claude/skills/go-clean-arch/SKILL.md
3. Verify actual code against Section 9 checklist of go-clean-arch/SKILL.md:
   - Interface declared in consumer layer (service.go declares Repository IF; rest handler declares Service IF)
   - domain/ has zero external package imports
   - service does not import internal/repository/mysql or internal/rest
   - error response uses getStatusCode + ResponseError (no ad-hoc formatting)
   - app/main.go contains ONLY: config load, connection init, DI wiring, server start
   - {domain}/mocks/ exists with mock for Repository IF
   - internal/rest/mocks/ exists with mock for Service IF
   - mocks match their interfaces (all methods present, correct signatures)
If any violation -> ask sample-api-agent to fix all violations, end this iteration.
If all pass -> proceed to frontend check.

Frontend compliance (run this sequence):
1. Read .claude/skills/front-context/SKILL.md
2. Read sample-front/.claude/skills/feature-sliced-design/SKILL.md
3. Verify actual code against Section 4 "Architectural Rules (MUST)":
   - Import direction strict: app→pages→widgets→features→entities→shared (no upward imports)
   - Every slice that has external consumers exports only through index.ts
   - No cross-imports between slices on the same layer
   - No business logic in shared/ (only infra: UI kit, utils, API client)
   - Single-use code stays in pages/ (no premature entity/feature extraction)
If any violation -> ask sample-front-agent to fix all violations, end this iteration.
If all pass -> proceed to Step 3.

Step 3: Requirements check.
Launch prd-checker agent with TASK_NAME={タスク名} and REQUIREMENTS from plans/tasks/{タスク名}/prd.md.
If all requirements met -> proceed to Step 4.
If any fail/partial -> ask the relevant agent to fix, end this iteration.

Step 4: Completion.
Only when Step 2 and Step 3 both fully pass, output: <promise>IMPL COMPLETE</promise>
```

### ステップ 4-2: ralph-loop 起動

`Skill` ツールで `ralph-loop:ralph-loop` を以下の**1行の短いプロンプト**で起動する：

```
Read and follow plans/tasks/{タスク名}/.ralph-impl.md --completion-promise IMPL COMPLETE --max-iterations 5
```

> **重要**: args には上記の1行の英語プロンプトのみを渡す。多行・日本語プロンプトを直接渡すとシェルパースエラーになる。

---

## 5. ループの終了条件

| 状態 | 動作 |
|---|---|
| ステップ 2・3 が全て pass | `<promise>IMPL COMPLETE</promise>` を出力 → ループ終了 |
| いずれかが fail | 修正依頼を出してイテレーション終了 → 次のイテレーションで再実行 |
| max-iterations（5回）到達 | ループ強制終了 → 残課題を Step 7 に記載して報告 |

---

## 6. 出力フォーマット

実装完了後に以下を報告する:

```
## 実装完了: {タスク名}

### バックエンド（sample-api）
- 変更ファイル: {ファイル一覧}
- test: pass / fail
- lint: pass / fail
- build: pass / fail

### フロントエンド（sample-front）
- 変更ファイル: {ファイル一覧}
- test: pass / fail
- lint: pass / fail
- build: pass / fail

### 要件充足チェック
- 総チェック項目数: N
- pass: N / fail: 0 / partial: 0

### 残課題
- {あれば記載、なければ「なし」}
```

---

## 制約

- PRD のスコープ外は実装しない（「対象外」と明記されたものは含めない）
- 未確定事項は推測で埋めず、TODO として明示する
- 実装は既存のアーキテクチャパターンに従う（sample-api は Clean Architecture、sample-front は Feature-Sliced Design）
- バックエンドとフロントエンドは **並列** で実装を進める
