---
name: impl
description: >
  `plans/{機能名}/{verb-noun}/prd.md` を参照して TDD で実装する。
  `/impl` または「実装して」「実装を開始」などのトリガーで起動。
  バックエンドは `sample-api-agent`、フロントエンドは `sample-front-agent` に委譲する。
  `/plan` や `/plan-writer` で要件が確定した後に使用する。
---

# /impl — タスク実装コマンド

`plans/{機能名}/{verb-noun}/prd.md` の要件に従い、TDD サイクルで実装する。

## 用語

| 用語 | 意味 | 例 |
|---|---|---|
| `{機能名}` | エンドポイントパスのリソース名（複数形のまま使用） | `groups` |
| `{verb-noun}` | API 操作単位の名前 | `list-groups` |

## いつ使うか

- `/plan` と `/plan-writer` で要件が確定し、`plans/{機能名}/{verb-noun}/prd.md` が存在する場合（例: `plans/groups/list-groups/prd.md`）
- 「実装して」「コードを書いて」「impl を実行して」などの指示があった場合

---

## 1. 実装対象の特定

`plans/` 配下のディレクトリ（`shared/` を含む）を列挙し、`AskUserQuestion` でどの PRD を実装するか選択させる。
ユーザーが明示している場合はそのまま使用する。

選択された PRD のパスを以下のルールで解決する:
- `plans/shared/` 配下のファイルが選択された場合 → `plans/shared/{処理名}.md`（共通処理）
- それ以外 → `plans/{機能名}/{verb-noun}/prd.md`（機能固有）

---

## 2. 事前チェック

対象の PRD ファイルが存在しない場合は以下を案内して停止する:

```
{PRDパス} が見つかりません。
先に /plan → /plan-writer を実行して要件を確定してください。
({PRDパス} は plans/shared/{処理名}.md または plans/{機能名}/{verb-noun}/prd.md)
```

---

## 3. PRD 読込と実装対象の確定

ステップ 1 で解決した PRD パス（`plans/shared/{処理名}.md` または `plans/{機能名}/{verb-noun}/prd.md`）を読み、以下を整理する:

| 項目 | 確認内容 |
|---|---|
| 対象システム | バックエンドのみ / フロントエンドのみ / 両方 |
| API 仕様 | エンドポイント・リクエスト・レスポンス・エラーケース |
| 処理フロー | バックエンド・フロントエンドそれぞれの処理ステップ |
| 実装方針 | 追加・変更するファイル一覧 |

---

## 3.5 UI 変更確認（フロントエンドの変更がある場合のみ）

PRD にフロントエンドの変更（画面レイアウト・コンポーネント・UX フロー）が含まれる場合、ralph-loop を起動する前に `AskUserQuestion` で確認する。

- **質問**: 画面の変更イメージをどう確認しますか？
- **選択肢**（単一選択）:
  1. フロントのスキルに任せる（`sample-front-agent` が実装時に判断）
  2. イメージを入力する（スクリーンショット・ASCII モックアップ・テキストで自由記述）

選択に応じた動作：

| 選択 | 動作 |
|---|---|
| フロントのスキルに任せる | `sample-front-agent` が `.claude/skills/front-context/SKILL.md` に従って実装時に判断する。そのまま Step 4 へ進む |
| イメージを入力する | `AskUserQuestion` のテキスト入力欄にスクリーンショット・ASCII アート・テキストでイメージを入力してもらう。入力内容を PRD に追記してから Step 4 へ進む。**画像はメモリに保存しない**。スクリーンショットが入力された場合は、レイアウト構造（コンポーネントの種類・配置・階層・サイズ感）のみを読み取る。画像内のラベル・本文・プレースホルダーなどのテキスト内容は参照しない |

---

## 4. ralph-loop の起動

`/ralph-loop:ralph-loop` を使い、**現在のセッション（オーケストレーター自身）** をループさせる。
ループの各イテレーションで、サブエージェントへの委譲・検証・修正依頼・要件充足チェックをすべて行う。

### ステップ 4-1: ループプロンプトファイルの書き出し

`.ralph-impl.md` を以下のルールで更新する。
- 共通処理の場合: `plans/shared/.ralph-impl.md`
- 機能固有の場合: `plans/{機能名}/{verb-noun}/.ralph-impl.md`

**更新ルール（必ず以下の順で判断する）**:
1. 対象ファイルが存在するか確認する
2. **存在しない場合** → `Write` ツールで新規作成する
3. **存在する場合** → `Read` ツールで内容を読み、現在の PRD パス・PRD から抽出した実装セクションと比較する
   - 差分がある箇所のみ `Edit` ツールで更新する
   - 差分がなければ更新しない
   - 変更のない箇所は触らない
   - 既存の補足メモがあり、今回の PRD と矛盾しない箇所は保持する

（{機能名}・{verb-noun}・{処理名} と {prd セクション} は実際の内容に置換）

```
Implement {PRDパス}. Skip completed steps, resume from failed ones.

Step 1: Delegate implementation in parallel.
Run sample-api-agent for backend and sample-front-agent for frontend simultaneously.
Each agent must run tests, lint, and build after implementation and report results.

Backend agent instructions (sample-api-agent):
Implement in sample-api/ using TDD (RED->GREEN->REFACTOR).
Read plans/{機能名}/{verb-noun}/prd.md for API spec, validation, DB operations, and test cases.
{prd のバックエンド関連セクション（英語または日本語）}

Frontend agent instructions (sample-front-agent):
Implement in sample-front/ using TDD (RED->GREEN->REFACTOR).
Read specs/{機能画面}/README.md for screen layout and UX requirements.
Read specs/{機能画面}/{機能名}.md for frontend flow, components, and state management.
{spec の該当画面・機能セクション（英語または日本語）}

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
Launch prd-checker agent with TASK_NAME={PRD識別子} and REQUIREMENTS from {PRDパス}.
If all requirements met -> proceed to Step 4.
If any fail/partial -> ask the relevant agent to fix, end this iteration.

Step 4: Completion.
Only when Step 2 and Step 3 both fully pass, output: <promise>IMPL COMPLETE</promise>
```

### ステップ 4-2: ralph-loop 起動

`Skill` ツールで `ralph-loop:ralph-loop` を以下の**1行の短いプロンプト**で起動する：

```
Read and follow {implパス} --completion-promise IMPL COMPLETE --max-iterations 5
```

> {implパス} は `plans/shared/.ralph-impl.md`（共通処理）または `plans/{機能名}/{verb-noun}/.ralph-impl.md`（機能固有）

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

### 次のステップ
- 修正が必要な場合: `/plan` に戻って要件を見直し、`/plan-writer` → `/impl` を繰り返す
- 全ての実装が完了したら: `/impl-done` を一回だけ実行してドキュメントを同期する
```

---

## 制約

- PRD のスコープ外は実装しない（「対象外」と明記されたものは含めない）
- 未確定事項は推測で埋めず、TODO として明示する
- 実装は既存のアーキテクチャパターンに従う（sample-api は Clean Architecture、sample-front は Feature-Sliced Design）
- バックエンドとフロントエンドは **並列** で実装を進める
