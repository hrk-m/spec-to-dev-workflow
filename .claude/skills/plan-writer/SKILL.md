---
name: plan-writer
description: 合意済みの要件を `plans/{ドメイン名}/{verb-noun}/prd.md` または `plans/shared/{処理名}.md` に書き出し、DB 変更がある場合のみ `schema-sync` と整合チェックまで行う。
---

# /plan-writer

`/plan` で合意済みの目的・ゴール・処理フローを、実装に使う PRD に落とし込む。
開始条件・停止条件・戻り先・完了条件の正本は `AGENTS.md` と `.claude/rules/workflow.md` とし、このスキルはそこから逸脱しない。

## 手順

1. `AskUserQuestion` で `/plan` 実行済みか確認する
   - **質問**: `/plan` は実行済みですか？
   - **選択肢 1**: `/plan` 済み
   - **選択肢 2**: `/plan` をまだ実行していない

2. 選択に応じて分岐する
   - **`/plan` 済み** → ステップ 3 へ進む
   - **`/plan` 未実行** → 以下を表示して停止する

   ```
   /plan を先に実行してください。
   目的・ゴール・処理フローが確定してから /plan-writer を使用してください。
   ```

3. 最低要件の確定と実装可能性チェックを行う

   3-1. **最低要件候補を生成する**

   `/plan` で合意した目的・ゴール・処理フローから、今回の実装で必ず満たすべき最低要件を番号付きリストで提示する。

   3-2. **`AskUserQuestion` で確認する**

   - **質問文**: `上記の最低要件候補を確認してください。`
   - **選択肢**:
     - `yes` — このまま確定する
     - `修正` — 修正・追加・削除したい要件がある
     - `コメント` — 補足コメントや注意点を追加したい

   3-3. **回答に応じてループする**

   | 回答 | 処理 |
   | --- | --- |
   | `yes` | 候補リストを最低要件として確定し、ステップ 3-4 へ進む |
   | `修正` | 指摘を反映してリストを更新し、ステップ 3-2 に戻る |
   | `コメント` | コメントを追記してステップ 3-2 に戻る |

   3-4. **`sample-api-agent` と `sample-front-agent` を並列起動し、実装可能性を確認する**

   各エージェントには、合意済み要件・処理フロー・最低要件を渡し、既存コードと照合して以下を報告させる。

   - 実装上の懸念点
   - 推奨する実装パターン
   - 不明点や判断が必要な箇所

   ここでの判定の正本は、**`/plan` で合意した要件と `api-context` / `front-context`** とする。
   既存コードは feasibility と drift 検出の補助情報としてのみ扱う。

   - 既存コードがスキルと食い違う場合は、PRD を既存コードに寄せず drift として報告する
   - 最低要件や処理フローの中で解消できる差分なら、ステップ 3-1 に戻って再調整する
   - 目的やゴールそのものの変更が必要なら `/plan` に戻す

4. **PRD 本体を書き出す**

   書き出し先は以下のルールで決定する。

   - 機能固有の変更: `plans/{ドメイン名}/{verb-noun}/prd.md`
   - 共通処理のみの変更: `plans/shared/{処理名}.md`

   対象ファイルが存在しない場合は新規作成し、存在する場合は差分のあるセクションだけ更新する。
   ここで **PRD 本体を確実に書き出してから** 次のステップへ進む。

5. **DB 変更がある場合のみ `schema-sync` を実行する**

   `/plan` で合意した要件に DB テーブルの追加・変更・削除が含まれる場合、`@references/schema-sync/SKILL.md` に従って `plans/schema.md` を更新する。
   `plans/schema.md` の更新は DB 変更がある場合だけ行う。

   - スキーマ変更なし → スキップしてステップ 6 へ進む
   - スキーマ変更あり → `schema-sync` を実行してからステップ 6 へ進む

6. **PRD とスキルの整合チェックを行う**

   **ステップ A**: `.ralph-alignment.md` を更新する

   - 共通処理の場合: `plans/shared/.ralph-alignment.md`
   - 機能固有の場合: `plans/{ドメイン名}/{verb-noun}/.ralph-alignment.md`

   対象ファイルが存在しない場合は新規作成し、存在する場合は現在の PRD と比較して差分がある箇所だけ更新する。

   ファイル内容テンプレート:

   ```
   Check {PRDパス} alignment with skills. Skip already-fixed issues from prior iterations.

   Steps:
   1. Read .claude/skills/api-context/SKILL.md
   2. Read sample-api/.claude/skills/go-clean-arch/SKILL.md
   3. Read .claude/skills/front-context/SKILL.md
   4. Read sample-front/.claude/skills/feature-sliced-design/SKILL.md
   5. Read {PRDパス}
   6. Check backend PRD against api-context guidance
   7. Check frontend PRD against front-context guidance
   8. Fix any mismatches directly with Edit tool on the PRD file
   9. When all checks pass with zero mismatches, output: <promise>ALIGNED</promise>
   ```

   **ステップ B**: `ralph-loop` を起動する

   ```
   Read and follow {alignmentパス} --completion-promise ALIGNED --max-iterations 5
   ```

   **ステップ C**: 自動修正の制約を守る

   - 機械的に判断できる差分のみ自動修正する
   - `目的・ゴール`、`最低要件`、API 契約は変更しない
   - 目的・ゴール自体の変更が必要なら `/plan` に戻す

7. **完了時の案内**

   `ALIGNED` で完了したら、以下のルールで次のステップを案内する。

   - 高リスク変更
   - 判断が分かれる差分
   - PRD 手動修正

   `ALIGNED` かつ上記のいずれかに該当する場合:

   ```
   PRD の作成が完了しました。

   次のステップは /plan-checker を実行してください。
   ```

   `ALIGNED` かつ上記に該当しない場合:

   ```
   PRD の作成が完了しました。

   次のステップは /impl を実行してください。
   ```
