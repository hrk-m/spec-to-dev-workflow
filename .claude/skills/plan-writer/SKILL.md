---
name: plan-writer
description: 合意済みの要件を `plans/tasks/{タスク名}/prd.md` に書き出す。/plan コマンドで目的・ゴール・フローの合意が取れた後に使用する。
---

# plan-writer

合意済みの内容を `plans/tasks/{タスク名}/prd.md` に書き出す。

## 手順

1. `AskUserQuestion` でユーザーに確認する:
   - **質問**: `/plan` は実行済みですか？
   - **選択肢 1**: `/plan` 済み — PRD に落とし込む
   - **選択肢 2**: `/plan` をまだ実行していない

2. 選択に応じて処理を分岐する:
   - **`/plan` 済み** → ステップ 3 へ進む
   - **`/plan` 未実行** → 以下のメッセージを表示してスキルを終了する。解決したい課題は何ですかとユーザーへ確認を取る
     ```
     /plan を先に実行してください。
     目的・ゴール・処理フローが確定してから plan-writer を使用してください。
     ```

3. **実装可能性チェック**（prd.md 書き出し前に必ず実施する）

   3-1. **最低要件の確定**

   `AskUserQuestion` でユーザーに確認し、今回の実装で必ず満たすべき最低要件を明確にする。
   - 例：「今回の実装で必須となる最低要件を教えてください」
   - ユーザーの回答をもとに最低要件リストを整理する

   3-2. **エージェントによる実装可能性チェック**

   最低要件が確定したら、`sample-api-agent` と `sample-front-agent` を**並列**で起動し、既存コードベースに照らした実装可能性を確認する。

   各エージェントへの指示：
   - 合意済みの要件（API 仕様・処理フロー・データ仕様）と確定した最低要件を渡す
   - 既存コードのアーキテクチャ・命名規則・共有ユーティリティと照合し、以下を報告させる
     - 実装上の懸念点（型の不一致・既存パターンとの乖離・未定義の依存など）
     - 推奨する実装パターン（既存コードの根拠つき）
     - 不明点・判断が必要な箇所

   3-3. **整合性チェックとループ判定**

   エージェントの報告内容と、スキル（`/plan` で合意した要件・処理フロー）の内容を照合する。

   - **不一致がある場合**（エージェントの懸念点・推奨パターンがスキル内容と乖離している場合）
     → `AskUserQuestion` でユーザーに差異を提示して確認を取り、回答に応じて要件または最低要件を修正する
     → **ステップ 3-1 に戻ってループする**（最低要件を再確定し、再度エージェントチェックを実施する）

   - **一致している場合**（エージェントの報告がスキル内容と整合しており懸念点もない場合）
     → そのままステップ 4 へ進む

4. 確定した要件を `plans/tasks/{タスク名}/prd.md` に書き出す

5. **各スキルとの照合チェック**（prd.md 書き出し後に必ず実施する）

   **ステップ 5-1**: Write ツールで `plans/tasks/{タスク名}/.ralph-alignment.md` に以下の内容を書き出す（{タスク名} は実際の名前に置換）：

   ```
   Check plans/tasks/{タスク名}/prd.md alignment with skills. Skip already-fixed issues from prior iterations.

   Steps:
   1. Read .claude/skills/api-context/SKILL.md
   2. Read .claude/skills/front-context/SKILL.md
   3. Read plans/tasks/{タスク名}/prd.md
   4. Check these points:
      - Backend layer structure (domain/service/repository/rest handler) matches go-clean-arch pattern
      - Repository Interface is declared in the consumer layer (service layer)
      - Error handling mapping matches skill definitions
      - Frontend file placement and import direction follows FSD v2.1
      - No premature entities/features extraction
   5. Fix any mismatches directly with Edit tool on prd.md
   6. When all checks pass with zero mismatches, output: <promise>ALIGNED</promise>
   ```

   **ステップ 5-2**: `Skill` ツールで `ralph-loop:ralph-loop` を以下の引数で起動する：

   ```
   Read and follow plans/tasks/{タスク名}/.ralph-alignment.md --completion-promise ALIGNED --max-iterations 5
   ```

   > **重要**: args には上記の1行の英語プロンプトのみを渡す。多行・日本語プロンプトを直接渡すとシェルパースエラーになる。

   ループが `ALIGNED` で完了したら、以下のメッセージをチャットに提示してスキルを終了する。

   ```
   PRD の作成が完了しました。

   - 要件の実装手段をチェックしたい場合は `/plan-checker` を実行してください。（推奨）
   - 実装を進める場合は `/impl` を実行してください。
   ```
