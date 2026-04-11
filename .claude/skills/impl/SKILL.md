---
name: impl
description: >
  修正サイクル中に `/plan-writer` 後（`/plan-checker` は任意）、または PRD 既存で必要な計画が既に揃っている純粋バグ修正・リファクタリング時に、選択した PRD を正本として `sample-api-agent` / `sample-front-agent` に TDD 実装を委譲する。
---

# /impl — タスク実装コマンド

`plans/shared/{処理名}.md` または `plans/{ドメイン名}/{verb-noun}/prd.md` の要件に従い、TDD サイクルで実装する。
開始条件・停止条件・戻り先・完了条件の正本は `AGENTS.md` と `.claude/rules/workflow.md` とし、このスキルはそこから逸脱しない。

## 用語

| 用語 | 意味 | 例 |
|---|---|---|
| `{ドメイン名}` | `plans/` 配下のドメインディレクトリ名（単数形） | `group` |
| `{verb-noun}` | API 操作単位の名前 | `list-groups` |

## いつ使うか

- `/plan` と `/plan-writer` で要件が確定し、`plans/shared/{処理名}.md` または `plans/{ドメイン名}/{verb-noun}/prd.md` が存在する場合（例: `plans/group/list-groups/prd.md`）
- 設計変更を伴わない純粋なバグ修正・リファクタリングで、対象機能の PRD が既存かつ必要な計画が既に揃っている場合（`/plan` と `/plan-writer` を省略してよい）
  - ※ PRD が未整備の場合はショートカットしない → `/plan` から開始し、plans/ に落とし込んでから通常の修正サイクル（`/plan-writer` 以降）へ進む
- 「実装して」「コードを書いて」「impl を実行して」などの指示があった場合

---

## 1. 実装対象の特定

`plans/` 配下のディレクトリ（`shared/` を含む）を列挙し、`AskUserQuestion` でどの PRD を実装するか選択させる。
ユーザーが明示している場合はそのまま使用する。

選択された要件パスを以下のルールで解決する:
- `plans/shared/` 配下のファイルが選択された場合 → `plans/shared/{処理名}.md`（共通処理）
- それ以外 → `plans/{ドメイン名}/{verb-noun}/prd.md`（機能固有）

---

## 2. 事前チェック

対象の PRD ファイルが存在しない場合は、以下を案内して停止する:

```
{PRDパス} が見つかりません。
PRD 未整備の純粋バグ修正を含め、先に /plan → /plan-writer を実行して要件を確定してください。
({PRDパス} は plans/shared/{処理名}.md または plans/{ドメイン名}/{verb-noun}/prd.md)
```

---

## 3. PRD の読込と実装対象の確定

ステップ 1 で解決した PRD パスを読み、以下を整理する:

| 項目 | 確認内容 |
|---|---|
| 対象システム | バックエンドのみ / フロントエンドのみ / 両方 |
| API 仕様 | エンドポイント・リクエスト・レスポンス・エラーケース |
| 処理フロー | バックエンド・フロントエンドそれぞれの処理ステップ |
| 実装方針 | 追加・変更するファイル一覧 |

このスキルでは **PRD を正本** として扱う。`specs/` は `/impl-done` で最終同期される成果物なので、存在する場合も補助参照にとどめる。

---

## 3.5 UI 変更確認（フロントエンドの変更がある場合のみ）

PRD にフロントエンドの変更（画面レイアウト・コンポーネント・UX フロー）が含まれる場合、ralph-loop を起動する前に `AskUserQuestion` で確認する。

**デフォルト動作**: `sample-front-agent` は常に `apple-ui-designer` スキルを適用して UI を実装する。この動作はオプションではなく必須。

### AskUserQuestion の組み立て方

PRD から以下を抽出し、**質問文の中に含めて**ユーザーに提示する:

- **変更対象の画面・コンポーネント**: どの画面・コンポーネントに何を追加・変更するか
- **追加・変更する UI 要素**: ボタン・ダイアログ・フォームフィールドなど具体的な要素
- **UX フロー**: ユーザー操作の流れ（例: ボタンクリック → ダイアログ表示 → 入力 → 送信）

質問文の形式例:

```
PRD から読み取った UI 変更内容:
- 変更対象: {対象画面・コンポーネント}
- UI 要素: {追加・変更する要素}
- UX フロー: {操作の流れ}

この内容で進めますか？追加で画面イメージを提供しますか？
（apple-ui-designer スキルはデフォルトで適用されます）
```

- **選択肢**（単一選択）:
  1. イメージを入力する（スクリーンショット・ASCII モックアップ・テキストで自由記述）
  2. yes（追加イメージなし）

選択に応じた動作：

| 選択 | 動作 |
|---|---|
| イメージを入力する | `AskUserQuestion` のテキスト入力欄にスクリーンショット・ASCII アート・テキストでイメージを入力してもらう。入力内容を `.ralph-impl.md` の実装指示に反映してから Step 4 へ進む。**画像はメモリに保存しない**。スクリーンショットが入力された場合は、レイアウト構造（コンポーネントの種類・配置・階層・サイズ感）のみを読み取る。画像内のラベル・本文・プレースホルダーなどのテキスト内容は参照しない |
| yes | 追加イメージなしで Step 4 へ進む。`sample-front-agent` が `apple-ui-designer` スキルに従って実装時に判断する |

---

## 4. ralph-loop の起動

`ralph-loop:ralph-loop` を使い、**現在のセッション（オーケストレーター自身）** をループさせる。
各イテレーションで行うこと: コード実装・編集は `sample-api-agent` / `sample-front-agent` に委譲 → 検証 → 修正依頼 → 要件充足チェック。
**オーケストレーター自身はコードを書かない。**

### ステップ 4-1: ループプロンプトファイルの書き出し

`.ralph-impl.md` を以下のルールで更新する。
- 共通処理の場合: `plans/shared/.ralph-impl.md`
- 機能固有の場合: `plans/{ドメイン名}/{verb-noun}/.ralph-impl.md`

**更新ルール（必ず以下の順で判断する）**:
1. 対象ファイルが存在するか確認する
2. **存在しない場合** → `Write` ツールで新規作成する
3. **存在する場合** → `Read` ツールで内容を読み、現在の PRD パス・PRD から抽出した実装セクションと比較する
   - 差分がある箇所のみ `Edit` ツールで更新する
   - 差分がなければ更新しない
   - 変更のない箇所は触らない
   - 既存の補足メモがあり、今回の PRD と矛盾しない箇所は保持する

（{ドメイン名}・{verb-noun}・{処理名} と {prd セクション} は実際の内容に置換）

```
Implement {要件パス}. Skip completed steps, resume from failed ones.

Step 1: Delegate implementation for the required targets.
Run sample-api-agent if backend is in scope.
Run sample-front-agent if frontend is in scope.
If both are in scope, run them simultaneously.
Each active agent must run tests, lint, and build after implementation and report results.

Backend agent instructions (sample-api-agent):
Implement in sample-api/ using TDD (RED->GREEN->REFACTOR).
Read {要件パス} for API spec, validation, DB operations, and test cases.
{prd のバックエンド関連セクション（英語または日本語）}

Frontend agent instructions (sample-front-agent):
Implement in sample-front/ using TDD (RED->GREEN->REFACTOR).
Read {要件パス} for frontend flow, components, and state management.
If a matching file under specs/ exists, read it only as secondary UX context.
Do not let specs override {要件パス}; during /impl the source of truth is the selected requirements file.
{prd のフロントエンド関連セクション（英語または日本語）}

Step 2: Validation gate.
If any test/lint/build fails -> ask the agent to fix it.
If all pass -> proceed to Step 2.5.

Step 2.5: Skill compliance check against architecture patterns.
NOTE: This is an early-feedback check within the impl loop. /arch-refactor performs the same checks as the final gate at the end of each modification cycle. The purpose of this step is to catch violations early and reduce round-trips, not to replace /arch-refactor.

Backend compliance (run this sequence only if backend is in scope):
1. Read .claude/skills/api-context/SKILL.md
2. Read sample-api/.claude/skills/go-clean-arch/SKILL.md
3. Verify actual code against Section 11 review checklist of go-clean-arch/SKILL.md:
   - Interface declared in consumer layer (service.go declares Repository IF; rest handler declares Service IF)
   - domain/ has zero external package imports
   - service does not import internal/repository/mysql or internal/rest
   - error response uses getStatusCode + ResponseError (no ad-hoc formatting)
   - app/main.go contains ONLY: config load, connection init, DI wiring, server start
   - {domain}/mocks/ exists with mock for Repository IF
   - internal/rest/mocks/ exists with mock for Service IF
   - mocks match their interfaces (all methods present, correct signatures)
If any violation -> ask sample-api-agent to fix all violations, end this iteration.
If frontend is also in scope -> proceed to frontend check.
If backend-only and all pass -> proceed to Step 3.

Frontend compliance (run this sequence only if frontend is in scope):
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
Launch prd-checker agent with TASK_NAME={PRD識別子} and REQUIREMENTS from {要件パス}.
If all requirements met -> proceed to Step 4.
If any fail/partial -> ask the relevant agent to fix, end this iteration.

Step 4: Completion.
Only when Step 2, Step 2.5, and Step 3 all fully pass, output: <promise>IMPL COMPLETE</promise>
```

### ステップ 4-2: ralph-loop 起動

`Skill` ツールで `ralph-loop:ralph-loop` を以下の**1行の短いプロンプト**で起動する：

```
Read and follow {implパス} --completion-promise IMPL COMPLETE --max-iterations 5
```

> {implパス} は `plans/shared/.ralph-impl.md`（共通処理）または `plans/{ドメイン名}/{verb-noun}/.ralph-impl.md`（機能固有）

> **重要**: args には上記の1行の英語プロンプトのみを渡す。多行・日本語プロンプトを直接渡すとシェルパースエラーになる。

---

## 5. ループの終了条件

| 状態 | 動作 |
|---|---|
| ステップ 2・2.5・3 が全て pass | `<promise>IMPL COMPLETE</promise>` を出力 → ループ終了 |
| いずれかが fail | 修正依頼を出してイテレーション終了 → 次のイテレーションで再実行 |
| max-iterations（5回）到達 | ループ強制終了 → 残課題を一覧で報告 |

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
- `/impl` 完了後は `/arch-refactor` を実行する（修正サイクルごとに毎回実行する）
- `/arch-refactor` の結果に従って `/plan` または `/impl` に戻って繰り返す
- **REVIEWED 前に `/e2e-gen` または `/impl-done` へ進まないこと**（修正サイクル中は最終ゲートを実行しない）
- `/arch-refactor` が REVIEWED を出力したら `/e2e-gen` → `/impl-done` の順で実行する
```

---

## 制約

- PRD のスコープ外は実装しない（「対象外」と明記されたものは含めない）
- 未確定事項は推測で埋めず、TODO として明示する
- 実装は既存のアーキテクチャパターンに従う（sample-api は Clean Architecture、sample-front は Feature-Sliced Design）
- 対象に含まれるシステムだけを実装する。両方が対象の場合のみ **並列** で進める
