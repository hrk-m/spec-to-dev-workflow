---
name: arch-refactor
description: >
  修正サイクルの締めとして `/impl` 完了後に、sample-api / sample-front の実コードを api-context / front-context に照らして検査し、違反を ralph-loop で最小修正する。
---

# /arch-refactor — アーキテクチャ適合チェック & 自動修正スキル

api-context / front-context スキルを絶対的な正として、
sample-api / sample-front のコードが各アーキテクチャルールに従っているかチェックし、
ralph-loop で違反を自動修正する。
開始条件・停止条件・戻り先・完了条件の正本は `AGENTS.md` と `.claude/rules/workflow.md` とし、このスキルはそこから逸脱しない。

---

## いつ使うか

- **`/impl` 完了後の修正サイクル内で必ず実行する**（REVIEWED 出力時点で修正サイクルを抜け、`/e2e-gen` へ進む。違反が残る場合は `/plan` または `/impl` に戻る）
- 修正サイクル中の実装後にスキルへの適合確認をしたいとき
- 修正サイクル中のリファクタリング後に drift が残っていないか確認したいとき
- 「スキルに沿っているか見て」「アーキテクチャのチェックをして」と言われたとき（開始タイミングは `/impl` 完了後に限る）

---

## 実行フロー

### ステップ 1: 対象の確認

`AskUserQuestion` でチェック対象を確認する。

- **両方**（sample-api + sample-front）
- **バックエンドのみ**（sample-api）
- **フロントエンドのみ**（sample-front）

ユーザーが明示している場合はそのまま使用する。

---

### ステップ 2: ralph-review.md の書き出し

`.claude/ralph-review.md` を以下のルールで更新する。

1. ファイルが存在するか確認する
2. **存在しない場合** → `Write` ツールで新規作成する
3. **存在する場合** → `Read` ツールで内容を読み、対象スコープと差分がある箇所のみ `Edit` ツールで更新する

ステップ 1 で選択された対象スコープ（両方 / バックエンドのみ / フロントエンドのみ）に応じて、
以下のテンプレートから対応セクションを含めて書き出す。

```
Check architecture compliance. Skip already-fixed violations from prior iterations.

{バックエンドセクション（対象の場合のみ含める）}

{フロントエンドセクション（対象の場合のみ含める）}

When all violations are resolved and all tests pass, output: <promise>REVIEWED</promise>
```

#### バックエンドセクション

```
## Backend Check (sample-api)

Step B-1: Read context skills.
1. Read .claude/skills/api-context/SKILL.md
2. Read sample-api/.claude/skills/go-clean-arch/SKILL.md
   Focus on: Section 7 MUST ルール, Section 11 レビュー時のチェックリスト

Step B-2: Scan sample-api/ and identify violations.
Check ALL of the following (these are absolute rules — no exceptions):
- IF (interface) は消費側で宣言されているか（service.go が Repository IF を宣言、handler が Service IF を宣言）
- domain/ に外部パッケージ import が入っていないか（標準ライブラリは可）
- service が internal/repository/mysql や internal/rest の実装へ直接依存していないか
- handler のエラーレスポンスが getStatusCode + ResponseError パターンを使っているか
- app/main.go が「設定読み込み・接続初期化・DI・サーバ起動」のみか（ユースケースや DDL が漏れていないか）
- interface を変更した場合、mock と test が同じ変更セットで追随しているか
- error の握り潰し・resource close 漏れ・rows.Err() 未確認が残っていないか

Step B-3: Report findings.
List each violation as: [B-N] <file:line> — <rule violated> — <fix required>
If no violations found, write "Backend: No violations found."

Step B-4: Fix violations (if any).
Delegate ALL backend fixes to sample-api-agent with the following instructions:
- Read .claude/skills/api-context/SKILL.md and the go-clean-arch skill first
- Fix ONLY the listed violations, minimum diff
- Run `make test && make lint && make build` after fixing
- Report: test/lint/build results and list of changed files
If no violations found, run `make test && make lint && make build` and confirm all pass.
If sample-api-agent reports failures → ask it to fix, end this iteration.
If all pass → proceed to frontend check (or completion if backend-only).
```

#### フロントエンドセクション

```
## Frontend Check (sample-front)

Step F-1: Read context skills.
1. Read .claude/skills/front-context/SKILL.md
2. Read sample-front/.claude/skills/feature-sliced-design/SKILL.md
   Focus on: Section 4 "Architectural Rules (MUST)"
3. Read sample-front/.claude/skills/vitest/SKILL.md (for test pattern compliance)

Step F-2: Scan sample-front/src/ and identify violations.
Check ALL of the following (these are absolute rules — no exceptions):
- Import direction: app → pages → widgets → features → entities → shared（上位レイヤーへの import 禁止）
- 外部コンシューマを持つスライスは index.ts 経由でのみエクスポートされているか（内部ファイルへの直接 import 禁止）
- 同一レイヤーのスライス間クロスインポートがないか
- shared/ にビジネスロジックが入っていないか（UI kit・utils・API client のみ許可）
- 単一ページでのみ使われるコードが pages/ に留まっているか（早期な entity/feature 切り出し禁止）
- ファイル名がドメインベースか（types.ts / utils.ts / helpers.ts 等の技術ロール命名禁止）

Step F-3: Report findings.
List each violation as: [F-N] <file:line> — <rule violated> — <fix required>
If no violations found, write "Frontend: No violations found."

Step F-4: Fix violations (if any).
Delegate ALL frontend fixes to sample-front-agent with the following instructions:
- Read .claude/skills/front-context/SKILL.md and the feature-sliced-design skill first
- Fix ONLY the listed violations, minimum diff
- Run `make check && make build` after fixing
- Report: test/lint/build results and list of changed files
If no violations found, run `make check && make build` and confirm all pass.
If sample-front-agent reports failures → ask it to fix, end this iteration.
If all pass → proceed to completion.
```

---

### ステップ 3: ralph-loop の起動

`Skill` ツールで `ralph-loop:ralph-loop` を以下の **1 行の短いプロンプト** で起動する：

```
Read and follow .claude/ralph-review.md --completion-promise REVIEWED --max-iterations 5
```

> **重要**: args には上記の 1 行の英語プロンプトのみを渡す。多行・日本語プロンプトを直接渡すとシェルパースエラーになる。

---

## ループの終了条件

| 状態 | 動作 |
|---|---|
| 全違反が解消され、対象ごとの検証コマンドが全 pass | `<promise>REVIEWED</promise>` を出力 → ループ終了 |
| 違反が残っている、またはテスト失敗 | エージェントへ修正依頼を出してイテレーション終了 → 次のイテレーションで再チェック |
| 設計変更が必要な違反（PRD 修正を要する）を検出 | ループを停止 → `/plan` に戻って修正サイクル全体（`/plan` から `/arch-refactor` REVIEWED まで）を回す |
| 実装修正のみでよい違反（PRD 変更不要）を検出 | ループを停止 → `/impl` に戻って実装修正のみ行い、再度 `/arch-refactor` を実行する |
| max-iterations（5 回）到達 | ループ強制終了 → 残課題を報告し、完了後の出力フォーマットの「次のステップ」に従って戻り先を判断する |

---

## 完了後の出力フォーマット

```
## arch-refactor 完了

### チェック結果
- バックエンド (sample-api): pass / violations found & fixed / skipped
- フロントエンド (sample-front): pass / violations found & fixed / skipped

### 修正した違反
- [B-1] ...
- [F-1] ...

### 残課題
- あれば記載、なければ「なし」

### 次のステップ

| 状態 | 戻り先 |
|---|---|
| API 仕様・処理フロー・レイヤー責務の変更が必要（PRD 修正を要する）| `/plan` に戻って修正サイクル全体（`/plan` から `/arch-refactor` REVIEWED まで）を回す |
| mock/test 漏れ・import 方向・パターン修正のみ（PRD 変更不要）| `/impl` に戻って実装修正のみ行い、再度 `/arch-refactor` を実行する |
| REVIEWED 出力（違反なし）| `/e2e-gen` へ進む |
```

---

## 制約

- スキルのルールは絶対的な正として扱う。既存コードの「現状」は免罪符にならない
- 修正のスコープは検出された違反の最小差分に限定する（横断リファクタは行わない）
- コードの修正は必ず `sample-api-agent` / `sample-front-agent` に委譲する（このスキル自身はコードを書かない）
- テスト・lint・build が全 pass することを確認してから次のイテレーションへ進む
