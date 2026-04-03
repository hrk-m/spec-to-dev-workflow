---
name: plan-writer
description: 合意済みの要件を `plans/{機能名}/{verb-noun}/prd.md` に書き出す。/plan コマンドで目的・ゴール・フローの合意が取れた後に使用する。
---

# plan-writer

合意済みの内容を `plans/{機能名}/{verb-noun}/prd.md` に書き出す。

## 手順

1. `AskUserQuestion` でユーザーに確認する:
   - **質問**: `/plan` は実行済みですか？
   - **選択肢 1**: `/plan` 済み — PRD に落とし込む
   - **選択肢 2**: `/plan` をまだ実行していない

2. 選択に応じて処理を分岐する:
   - **`/plan` 済み** → ステップ 3 へ進む
   - **`/plan` 未実行** → 以下のメッセージを表示してスキルを終了する
     ```
     /plan を先に実行してください。
     目的・ゴール・処理フローが確定してから plan-writer を使用してください。
     ```

3. **最低要件の確定と実装可能性チェック**（prd 書き出し前に必ず実施する）

   3-1. **最低要件の確定**

   以下の手順で最低要件を確定する。

   **Step A — 候補リストの生成**

   `/plan` で合意した目的・ゴール・処理フローをもとに、今回の実装で必ず満たすべき最低要件の候補を AI が自律的に洗い出し、チャットに番号付きリストで提示する。

   例：
   ```
   【最低要件 候補リスト】
   1. ユーザーが認証なしでアクセスした場合に 401 を返す
   2. 一覧取得 API は페이지네ーション対応（limit/offset）
   3. ...
   ```

   **Step B — AskUserQuestion で確認**

   候補リストを提示した直後に `AskUserQuestion` を呼び出し、以下の形式で確認する。

   - **質問文**: 「上記の最低要件候補を確認してください。」
   - **選択肢**:
     - `yes` — このまま確定する
     - `修正` — 修正・追加・削除したい要件がある（どれを変えるか教えてください）
     - `コメント` — 補足コメントや注意点を追加したい

   **Step C — 回答に応じた分岐**

   | 回答 | 処理 |
   |------|------|
   | `yes` | 候補リストをそのまま最低要件として確定し、ステップ 3-2 へ進む |
   | `修正` | ユーザーの指摘内容を反映してリストを更新し、Step B に戻って再確認する |
   | `コメント` | コメントをリストの末尾に追記し、Step B に戻って再確認する |

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

4. **書き出し先の決定**

   @references/api-sync/SKILL.md の Step 7 に従って書き出す。

5. **schema-sync**（DB スキーマに変更がある場合のみ実施する）

   `/plan` で合意した要件に DB テーブルの追加・変更・削除が含まれる場合、`@references/schema-sync/SKILL.md` に従って `plans/schema.md` を更新する。

   - スキーマ変更なし → スキップしてステップ 6 へ進む
   - スキーマ変更あり → schema-sync を実行してからステップ 6 へ進む

6. **各スキルとの照合チェック**（prd 書き出し後に必ず実施する）

   **ステップ A**: `.ralph-alignment.md` を更新する。
   - 共通処理の場合: `plans/shared/.ralph-alignment.md`
   - 機能固有の場合: `plans/{機能名}/{verb-noun}/.ralph-alignment.md`

   **更新ルール（必ず以下の順で判断する）**:
   1. 対象ファイルが存在するか確認する
   2. **存在しない場合** → `Write` ツールで新規作成する
   3. **存在する場合** → `Read` ツールで内容を読み、現在の PRD パス・内容と比較する
      - 差分がある箇所のみ `Edit` ツールで更新する
      - 差分がなければ更新しない
      - 変更のない箇所は触らない
      - 既存の補足メモがあり、今回の PRD と矛盾しない箇所は保持する

   ファイルの内容テンプレート（{PRDパス} は実際のパスに置換）:

   ```
   Check {PRDパス} alignment with skills. Skip already-fixed issues from prior iterations.

   Steps:
   1. Read .claude/skills/api-context/SKILL.md
   2. Read sample-api/.claude/skills/go-clean-arch/SKILL.md (referenced in api-context)
   3. Read .claude/skills/front-context/SKILL.md
   4. Read sample-front/.claude/skills/feature-sliced-design/SKILL.md (referenced in front-context)
   5. Read {PRDパス}
   6. Check backend PRD against go-clean-arch/SKILL.md Section 9 checklist:
      - Interface declared in consumer layer (service.go→Repository IF; handler→Service IF)
      - domain/ has zero external package imports
      - service does not depend on adapter implementations
      - error handling uses getStatusCode + ResponseError pattern
      - app/main.go: config load, connection init, DI wiring, server start ONLY (no DDL, no business logic)
      - {domain}/mocks/ and internal/rest/mocks/ are listed in added files
      - mocks defined for each interface
   7. Check frontend PRD against feature-sliced-design/SKILL.md Section 4 "Architectural Rules (MUST)":
      - Import direction: app→pages→widgets→features→entities→shared (no upward imports)
      - Slices with external consumers export through index.ts
      - No cross-imports between slices on the same layer
      - No business logic in shared/ (only infra: UI kit, utils, API client)
      - Single-use code placed in pages/ (no premature entity/feature extraction)
   8. Fix any mismatches directly with Edit tool on the PRD file
   9. When all checks pass with zero mismatches, output: <promise>ALIGNED</promise>
   ```

   **ステップ B**: `Skill` ツールで `ralph-loop:ralph-loop` を以下の引数で起動する：

   ```
   Read and follow {alignmentパス} --completion-promise ALIGNED --max-iterations 5
   ```

   > {alignmentパス} は `plans/shared/.ralph-alignment.md`（共通処理）または `plans/{機能名}/{verb-noun}/.ralph-alignment.md`（機能固有）

   > **重要**: args には上記の1行の英語プロンプトのみを渡す。多行・日本語プロンプトを直接渡すとシェルパースエラーになる。

   ループが `ALIGNED` で完了したら、以下のメッセージをチャットに提示してスキルを終了する。

   ```
   PRD の作成が完了しました。

   - 要件の実装手段をチェックしたい場合は `/plan-checker` を実行してください。（推奨）
   - 実装を進める場合は `/impl` を実行してください。
   ```
