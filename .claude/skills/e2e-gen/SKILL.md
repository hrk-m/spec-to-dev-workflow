---
name: e2e-gen
description: >
  `/arch-refactor` が REVIEWED を出力した後に実行する最終ゲート前半。
  `plans/` の最終同期と必要に応じた PRD / schema 更新を行い、E2E ケースを確定して
  `sample-front-agent` に Playwright 実装を委譲し、`make e2e` を pass させる。
---

# /e2e-gen — E2E テスト生成スキル

`/arch-refactor` が REVIEWED を出力した後にだけ実行する。
このスキルの責務は、`plans/` の最終同期と、E2E テストの追加・検証である。

開始条件・停止条件・戻り先・完了条件の正本は `AGENTS.md` と `.claude/rules/workflow.md` とし、このスキルはそこから逸脱しない。

## 前提

- `/arch-refactor` が `REVIEWED` を出力している
- 修正サイクルを抜けている
- `/impl-done` はまだ実行していない

## 実行手順

### Step 1: `plans/` を最終同期する

1. 機能固有 PRD がある場合は `api-sync` を実行し、対象 PRD を同期する
2. DB 変更がある場合は `schema-sync` を実行し、`plans/schema.md` を同期する
3. つまり、`plans/` の最終同期と必要に応じた PRD / schema 更新は `/e2e-gen` の責務とする

### Step 1 の停止条件

- 最低要件 / API 契約 / エラー挙動 / UX フローの解釈が揺れる差分が見つかった場合は `/plan` に戻す
- 実装方針 / 追加ファイル / テスト方針の差分が見つかった場合は、仕様・設計の問題なら `/plan`、実装のみの問題なら `/impl` に戻す
- 上記に該当しない場合だけ次へ進む

### Step 2: 既存状況を把握する

以下を並列で確認する。

1. 同期後の機能固有 `prd.md`
   - 機能固有 PRD がない共通処理のみの変更では `plans/shared/{処理名}.md` を正本として読む
   - `plans/shared/*.md` があれば補助参照も含めてテスト対象を洗い出す
2. `e2e/tests/` の既存テスト
3. `e2e/entrypoint.sh` のシードデータ

### Step 3: 10 カテゴリ観点を確認する

No.1 から No.10 までを順番に確認する。

各カテゴリごとに、同期後の PRD / 補助参照した `plans/shared/*.md` / 既存 E2E / seed データを根拠として、今回の要件・仕様に沿った具体的な確認観点を洗い出す。

各カテゴリの確認では、`AskUserQuestion(multiSelect: true)` を使って「今回の E2E に含める観点」を確認する。

- 選択肢は固定文言をそのまま並べず、今回の要件・仕様に即した具体的な観点に言い換えて提示する
- 各カテゴリの選択肢には必ず `今回の変更では対象外` を含める
- ユーザーが選んだ観点だけを Step 4 のテストケース候補に落とし込む
- No.1 から No.10 までの確認がすべて終わるまで Step 4 に進まない

| No. | カテゴリ | 確認内容 |
| --- | --- | --- |
| 1 | ユーザー視点の基本フロー | 主操作の流れが通るか |
| 2 | ビジネスコアのシナリオ | 価値が直接出る主要フローか |
| 3 | 入力・データ・バリデーション | 正常入力と代表的な入力エラー |
| 4 | API・外部連携の整合性 | フロント、バック、DB、外部 API の整合 |
| 5 | 画面遷移・UI 挙動 | 遷移、ローディング、完了、失敗時の見え方 |
| 6 | リグレッション防止 | 壊したくないメインユースケース |
| 7 | ブラウザ・環境差分 | 実行環境差分の考慮 |
| 8 | 権限・認可・セキュリティ | 権限制御や保護すべき導線 |
| 9 | 障害・例外系 | タイムアウト、通信失敗、外部依存失敗 |
| 10 | データ準備・テスト前提 | seed、fixture、前提データの妥当性 |

### Step 4: テストケースリストを確定する

Step 3 でカテゴリごとに確定した観点を、既存カバー済み / 新規追加に分けて一覧化し、`AskUserQuestion` で最終確認する。

### Step 5: `ralph-loop` で E2E を実装する

1. `e2e/.ralph-e2e-gen.md` を作成または更新する
2. `ralph-loop` を起動する

   ```
   Read and follow e2e/.ralph-e2e-gen.md --completion-promise "E2E COMPLETE" --max-iterations 5
   ```

3. `sample-front-agent` に `e2e/tests/` の実装を委譲し、`make e2e` を実行させる
   - frontend 変更の有無にかかわらず、`e2e/tests/` の担当は `sample-front-agent`

## 戻り先ルール

- E2E テスト実装自体の問題なら `/e2e-gen` 内で修正を継続する
- `/e2e-gen` 内で解決できない実装のみの問題、または BE / FE 修正が必要なら `/impl` に戻る
- 仕様・設計の問題なら `/plan` に戻る
- `E2E COMPLETE` を出力したら `/impl-done` に進む

## 完了条件

- `plans/` の最終同期が完了している
- E2E ケースの最終合意が取れている
- `make e2e` が全 pass している
- `E2E COMPLETE` を出力している
