---
name: plan-checker
description: `plan-writer` が生成した `plans/tasks/{タスク名}/prd.md` を `.claude/skills/api-context/SKILL.md` と `.claude/skills/front-context/SKILL.md` に照らして検査し、不一致があれば `AskUserQuestion` で確認したうえで修正する。go-clean-arch / FSD v2.1 に合う実装方針かを、`/impl` 前に詳細確認したいときに使う。
---

# plan-checker

`plan-writer` が生成した PRD の「実装方針」を、プロジェクトのアーキテクチャスキルに照らして詳細チェックする。
判定基準そのものは `api-context` / `front-context` に依存し、このスキルは PRD 読み取り・差異整理・ユーザー確認・再チェックの進行役だけを担う。

## いつ使うか

- `plan-writer` で `plans/tasks/{タスク名}/prd.md` を書き出した直後
- `/impl` の前
- PRD を手修正したあとに再検査したいとき

## 前提

1. `plans/tasks/{タスク名}/prd.md` が存在すること
2. 次のスキルを必ず読むこと
   - `.claude/skills/api-context/SKILL.md`
   - `.claude/skills/front-context/SKILL.md`

`prd.md` が存在しない場合は停止し、`plan-writer` を先に実行するよう案内する。

## 判定の優先順位

1. ユーザーと合意済みの要求
   - `概要`
   - `目的・ゴール`
   - `最低要件`
   - API の振る舞い
2. `.claude/skills/api-context/SKILL.md`
3. `.claude/skills/front-context/SKILL.md`
4. それぞれが参照する実装スキル
5. 現在のコードベース・steering 文書（参考情報）

要件は勝手に変えない。修正対象は原則として `アーキテクチャ構成`、`追加ファイル`、`既存ファイルの変更`、`実装順序`、`テスト方針` などの実装方針セクションに限定する。
スキル定義と現コードが矛盾する場合は、PRD を黙って現コード寄せにせず、`skill-definition conflict` として報告する。

## 実行手順

1. タスク名を特定し、`plans/tasks/{タスク名}/prd.md` を読む
2. PRD から以下を抽出する
   - バックエンドの API 仕様・処理フロー・実装方針
   - フロントエンドの画面/処理フロー・実装方針
   - 追加ファイル、変更ファイル、依存ライブラリ、テスト方針
3. `api-context` / `front-context` と参照先スキルを読む
4. `api-context` の `PRD 照合観点` に従ってバックエンド整合性チェックを実施する
5. `front-context` の `PRD 照合観点` に従ってフロントエンド整合性チェックを実施する
6. `fail` があれば、差異と修正案を整理して `AskUserQuestion` でユーザーに確認する
7. ユーザー回答に応じて PRD を修正する
8. 修正後、ステップ 4 から再実施する
9. `fail` が 0 になったら結果を報告する

## 判定レベル

- `pass`: スキルと整合している
- `fail`: スキル違反。`fail 時の対応` フローを踏む
- `warn`: スキルとコードベース/文書の間に差異があり、ユーザー判断またはスキル修正が必要

## 照合観点の参照先

バックエンドの詳細観点は `.claude/skills/api-context/SKILL.md` の `PRD 照合観点` を参照する。
フロントエンドの詳細観点は `.claude/skills/front-context/SKILL.md` の `PRD 照合観点` を参照する。

`plan-checker` 自身に個別のアーキテクチャ詳細を重複定義しない。
観点の追加・変更は `api-context` / `front-context` 側を更新し、その内容を `plan-checker` が利用する。

## fail 時の対応

`fail` が 1 件でもある場合、次の流れを必ず踏む。ユーザー確認なしに PRD を自動で確定させない。

### 1. AskUserQuestion で確認する

質問文には必ず **スキルの根拠** を以下の形式で含める:

```
{スキルファイル名} > {ルール/セクション名}
{具体的な差異の説明}
```

| 参照先 | 書き方 |
|--------|--------|
| バックエンド | `api-context/SKILL.md > {ルール名またはセクション名}` |
| フロントエンド | `front-context/SKILL.md > {ルール名またはセクション名}` |

引用元が不明な場合は「スキルに明示的な定義なし（判断理由: {根拠}）」と記載する。

選択肢では「提案どおり修正する」「要件を見直す」「今回は修正しない」を最低限提示する。"Other" での補足は優先して反映する。

### 2. PRD を修正する

修正する順番:

1. `アーキテクチャ構成`
2. `追加ファイル` / `既存ファイルの変更`
3. `処理フロー` に混ざった実装詳細
4. `実装順序`
5. `テスト方針`

原則触らない: `概要` / `目的・ゴール` / `最低要件` / API のユーザー向け振る舞い

要件自体を変えないと整合しない場合は、その場で修正せず差分を整理して `AskUserQuestion` でユーザー合意を取る。

### 3. ステップ 4 から再チェックする

## 出力形式

```text
## plan-checker result: {task}

### summary
- backend: pass / fail / warn
- frontend: pass / fail / warn
- prd_updated: yes / no

### findings
- [API-1] fail: ...
- [FRONT-2] fail: ...
- [warn] skill-definition conflict: ...

### next action
- fail が 1 つでもあれば `AskUserQuestion` で確認し、回答に応じて PRD を修正して再実行
- warn のみならユーザー確認待ち
- fail が 0 で実装へ進める状態なら `/impl {task}` の実行を案内
```

## 完了条件

- `fail` が 0
- PRD の実装方針が `api-context` / `front-context` とその参照先スキルに整合している
- 不整合がコードベース由来の場合は `warn` として明記済み

完了時は、チェック結果の報告に加えて次を案内する:

```text
チェックが完了しました。実装を進める場合は `/impl {task}` を実行してください。
```
