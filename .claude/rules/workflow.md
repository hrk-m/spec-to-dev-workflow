# ワークフロー

- このファイルでは、以下のフロー全体ルールに従う。
- 独自ショートカット、独自分岐、独自停止条件は追加しない。
- 各スキルの開始条件、停止条件、戻り先、完了条件は下記に従う。

### フェーズ別の図

#### 1. 開始時の入口

```text
[開始]
  ├─ 設計変更あり・新機能・バグ修正 / PRD 未整備の純粋バグ修正
  │    └─ /plan

※ PRD 既存の純粋バグ修正・リファクタリングで、必要な計画が既に揃っている場合は
   /impl で実装フェーズに入ってよい

※ /impl から開始した場合も、plans の最終同期・必要に応じた更新は /e2e-gen で行う
```

#### 2. 通常の修正サイクル

```text
/plan
  ├─ 合意未了で再実行
  │    └─ /plan
  └─ 合意済み
       └─ /plan-writer

/plan-writer
  ├─ /plan 未実行
  │    └─ 停止（/plan を先に実行）
  ├─ 最低要件の再調整 / 実装可能性差分の再整理
  │    └─ /plan-writer
  ├─ 目的・ゴール変更が必要
  │    └─ /plan
  ├─ 高リスク変更 / 判断が分かれる差分 / PRD 手動修正
  │    └─ /plan-checker
  └─ ALIGNED（上記3条件に非該当の場合）
       └─ /impl

/plan-checker
  ├─ fail あり・PRD 修正で再チェック
  │    └─ /plan-checker
  ├─ 要件変更が必要
  │    └─ /plan
  └─ fail 0
       └─ /impl

/impl
  ├─ 未充足 / 失敗で再実行
  │    └─ /impl
  └─ IMPL COMPLETE
       └─ /arch-refactor

/arch-refactor
  ├─ 違反修正を継続
  │    └─ /arch-refactor
  ├─ 設計変更が必要
  │    └─ /plan
  ├─ 実装修正のみ
  │    └─ /impl
  └─ REVIEWED
       └─ 最終ゲートへ
```

#### 3. PRD 未整備の純粋バグ修正の扱い

```text
[開始]
  └─ PRD 未整備の純粋バグ修正
       └─ /plan
            └─ バグ箇所・再現条件・期待挙動を明確化し
               plans/ に落とし込んでから通常の修正サイクルへ
```

#### 4. 最終ゲート

※ /e2e-gen で plans の最終同期と、必要に応じた PRD / schema の更新を行う

※ /impl-done で steering / specs を同期し、plans は更新しない

```text
/e2e-gen
  ├─ E2E テスト実装問題
  │    └─ Step 5 の ralph-loop 内でループ継続（外部に戻らない）
  ├─ 仕様・設計の問題
  │    └─ 問題内容をユーザーに報告してスキルを停止
  ├─ BE / FE 実装バグ
  │    └─ スキル終了時にバグ内容をまとめてユーザーに報告し /impl を促す
  └─ E2E COMPLETE
       └─ /impl-done

/impl-done
  ├─ docs/steering/ を同期
  ├─ specs/ を生成・同期
  ├─ plans/ は更新しない
  └─ 完了
```

## 詳細フロー

0. 開始条件

- 設計変更あり・新機能・バグ修正は原則 /plan から開始する
- PRD 未整備の純粋バグ修正は /plan から開始し、バグ箇所・再現条件・期待挙動を明確化して plans/ に落とし込む
- PRD 既存の純粋バグ修正・リファクタリングで、必要な計画が既に揃っている場合は、試行錯誤しながら実装するため /impl で実装フェーズに入ってよい
- /impl から開始した場合も、plans の最終同期と必要に応じた更新は /e2e-gen で行う

---

1. /plan

- 実装パターンの把握（スキル起動直後・並列）
- sample-api-agent と sample-front-agent に技術スタック・アーキテクチャの調査を依頼する
- 影響 plans の確認
- Glob で plans/*/*/prd.md と plans/shared/*.md を収集する
- AskUserQuestion(multiSelect) で今回の計画に関係する機能を選択させる（末尾に「新機能を追加する」を含める）
- 選択された plans/{ドメイン名}/{verb-noun}/prd.md または plans/shared/{処理名}.md を Read して仕様を把握する（specs/ は存在する場合のみ補助参照）
- PRD 未整備の純粋バグ修正でも /plan から開始し、不具合箇所・再現条件・期待挙動を明確化して plans/ に落とし込む
- 「新機能を追加する」が含まれる場合は AskUserQuestion で機能名を確認する
- Phase 1 — 目的・ゴールの合意
- 対象機能と「なぜ作るか・完成形」をユーザーと合意する
- AskUserQuestion で最終合意を取るまで Phase 2 へ進めない
- Phase 2 — 詳細処理フローの設計
- エンドポイントごとに以下を 1 ステップずつ AskUserQuestion で確認する（全体フローを先に提示することは禁止）
  - 5-1. リクエスト・バリデーション
  - 5-2. 処理ロジック（FE/BE）
  - 5-3. ファイル配置
  - 5-4. レスポンス・エラーケース（全パターン・発生レイヤー付き）
  - 5-5. ユニットテストケース（正常系・異常系・境界値・分岐条件）
- エンドポイントごとに 1〜5 の確認が完了したら、そのエンドポイントの合意内容を反映した詳細処理フローを再提示して最終合意を取る
- 複数エンドポイントがある場合は「1〜5 の確認 → 最終合意」をエンドポイントごとに繰り返す
- 全エンドポイントの最終合意後、合意済み要件をチャットにまとめて提示し、/plan-writer を案内する

---

2. /plan-writer

- AskUserQuestion で /plan 実行済みか確認する
- /plan 済み → 次へ進む
- /plan 未実行 → 「/plan を先に実行してください」と案内して停止する
- 要件整理
- /plan の要件整理の内容をリスト提示する
- AskUserQuestion で yes / 修正 / コメント を選択させる。yes になるまで繰り返す
- 実装可能性チェック（sample-api-agent + sample-front-agent を並列起動）
- 懸念点・推奨パターン・不明点を報告させる
- 不一致あり（要件整理・処理フロー内で解消可能）→ AskUserQuestion でユーザーに差異を提示し、要件整理に戻ってループする
- 不一致あり（目的・ゴール自体の変更が必要）→ その旨を報告して /plan に戻す
- 一致 → 書き出しへ進む
- 書き出し先の決定
- 機能固有 → plans/{ドメイン名}/{verb-noun}/prd.md
- 共通処理 → plans/shared/{処理名}.md
- schema-sync（DB 変更がある場合のみ）
- DB 変更がある場合のみ plans/schema.md を更新する
- 一次整合チェック（ralph-loop）
- .ralph-alignment.md を書き出し（存在する場合は差分 Edit のみ）、ralph-loop を起動する
- 機械的に判断できる差分のみ自動修正する（目的・ゴール・最低要件・API 契約は変更禁止）
- /plan-checker 条件（高リスク変更・判断が分かれる差分・PRD を手動で修正した場合）に該当するときは /plan-checker に進む
- 上記以外で機械的に整合が取れたら ALIGNED で完了し、/impl に進む

---

3. /plan-checker（通常は任意）

- 実行条件：高リスク変更・判断が分かれる差分がある場合・PRD を手動で修正した場合のみ
- PRD（plans/shared/{処理名}.md または plans/{ドメイン名}/{verb-noun}/prd.md）を読み、api-context / front-context の照合観点でチェックする
- fail あり → スキルの根拠を明示した AskUserQuestion でユーザーに確認し、PRD を修正して再チェックする
- 要件自体の変更が必要な場合は /plan へ戻す
- fail が 0 になったら、/impl を案内する

---

4. /impl

- plans/ を Glob で列挙し、shared/ を含めて AskUserQuestion で実装対象の PRD を選択させる
- 選択した要件ファイル（plans/shared/{処理名}.md または plans/{ドメイン名}/{verb-noun}/prd.md）を読み、対象システム（BE / FE / 両方）・API 仕様・処理フロー・実装方針を整理する
- UI 変更確認（フロント変更がある場合のみ）
- AskUserQuestion で「スキルに任せる / イメージを入力する」を選択させる
- イメージ入力の場合は .ralph-impl.md の実装指示に反映してから次へ進む
- ralph-loop の起動（.ralph-impl.md を書き出し・max 5 イテレーション）
- Step 1：対象に含まれる sample-api-agent（BE）/ sample-front-agent（FE）を起動し、両方対象の場合は並列で TDD（RED → GREEN → REFACTOR）実装させる
- Step 2：テスト / lint / build が全 pass かチェックする。失敗 → 修正依頼してイテレーション終了
- Step 2.5：スキル適合チェック（go-clean-arch / FSD の MUST ルール）を実施する。違反 → 各エージェントに修正依頼してイテレーション終了
- Step 3：prd-checker エージェントで選択した要件ファイルを入力に要件充足チェックを行う。未充足 → 修正依頼してイテレーション終了
- Step 4：Step 2・2.5・3 が全 pass → IMPL COMPLETE を出力してループ終了

---

5. /arch-refactor

- AskUserQuestion でチェック対象（両方 / バックエンドのみ / フロントエンドのみ）を確認する
- .claude/ralph-review.md を書き出し（存在する場合は差分 Edit のみ）、ralph-loop を起動する（max 5 イテレーション）
- バックエンドチェック（対象に含まれる場合のみ）：インターフェース宣言・domain の外部 import・エラーパターン・main.go の責務・mock の整合性等を全件チェックする。違反あり → sample-api-agent に最小差分で修正委譲 → make test && make lint && make build を確認する
- フロントエンドチェック（対象に含まれる場合のみ）：import 方向・index.ts export・クロスインポート・shared のビジネスロジック禁止・ファイル命名等を全件チェックする。違反あり → sample-front-agent に最小差分で修正委譲 → make check && make build を確認する
- 違反が残る場合の判断
- 設計変更が必要 → /plan に戻る
- 実装修正のみでよい → /impl に戻る
- 全違反が解消され検証コマンドが全 pass → REVIEWED を出力する
- REVIEWED をもって修正サイクルを終了し、/e2e-gen へ進む

---

6. /e2e-gen

- Step 1：plans の最終同期（/e2e-gen 起動時に必ず実行する）
- api-sync エージェントを常に起動し、実装コードと対象 PRD を照合して差分がある箇所のみ plans を更新する（`.claude/skills/plan-writer/references/api-sync/SKILL.md` に従う）
- DB 変更がある場合は schema-sync エージェントを並列起動し、plans/schema.md を必要に応じて更新する（`.claude/skills/plan-writer/references/schema-sync/SKILL.md` に従う）
- 両エージェントの完了を待ってから次のステップへ進む
- つまり、plans の最終同期と必要に応じた PRD / schema 更新は /e2e-gen の責務とする
- 停止条件①（最低要件 / API 契約 / エラー挙動 / UX フローの解釈が揺れる差分）→ 問題内容をユーザーに報告してスキルを停止する
- 停止条件②（実装方針 / 追加ファイル / テスト方針の差分）→ 仕様・設計の問題なら問題内容をユーザーに報告してスキルを停止する。実装のみの問題なら内容を蓄積し、スキル終了時に全バグをまとめてユーザーに報告し /impl の実行を促す
- 停止条件①・停止条件②の仕様・設計問題のいずれにも該当しない場合は次のステップへ進む（停止条件②の実装のみ問題はバグを蓄積しつつ次のステップへ進む）
- Step 2：既存状況の把握（並列）
- 同期後の機能固有 prd.md を読み、機能固有 PRD がない共通処理のみの変更では plans/shared/{処理名}.md を正本として読む。plans/shared/\*.md があれば補助参照も含めてテスト対象を洗い出す
- e2e/tests/ の既存テストを確認し、カバー済み項目を把握する
- e2e/entrypoint.sh のシードデータを確認する
- Step 3：10 カテゴリ観点の一括確認
- `git diff` で `plans/` の変更差分を取り、同期後の PRD / `plans/shared/*.md` / 既存 E2E / seed データと照合して No.1〜No.10 の全カテゴリを一括分析する
- 追加推奨（今回の変更で新たにカバーすべき観点）と削除推奨（不要になった既存テスト観点）を `No.{カテゴリ番号} {カテゴリ名}` でグルーピングして一覧提示する。変更不要な既存テストは末尾に 1 行サマリーで示す
- AskUserQuestion で `OK / 修正 / コメント` を一括確認し、確認が取れたら次へ進む
- Step 4：テストケースリストの確定
- Step 3 で確定した観点を、既存カバー済み / 新規追加に分けて一覧提示し、AskUserQuestion で最終確認する
- Step 5：ralph-loop の起動（e2e/.ralph-e2e-gen.md を書き出し・max 5 イテレーション）
- sample-front-agent に E2E テストの実装を委譲し、make e2e を実行させる（frontend 変更の有無にかかわらず、e2e/tests の担当は sample-front-agent）
- テスト失敗（/e2e-gen 内で解決できる E2E テスト実装問題）→ sample-front-agent に修正依頼してイテレーション終了
- テスト失敗（BE / FE の実装バグが原因）→ ループを停止し、バグ内容を蓄積する。スキル終了時に全バグをまとめてユーザーに報告し /impl の実行を促す（/e2e-gen 自身は実装しない）
- テスト失敗（仕様・設計の問題）→ ループを停止し、問題内容をユーザーに報告してスキルを停止する
- 全 pass → E2E COMPLETE を出力してループ終了

---

7. /impl-done

- 前提：/arch-refactor 完了・/e2e-gen の E2E pass・plans/ 同期済み・実装を締める段階であること
- Step 1：steering 同期（並列）
- 変更対象に含まれる sample-api-agent / sample-front-agent を起動し、両方対象の場合は同時に各サービスの docs/steering/ を現在の実装に同期させる
- Step 2：spec 同期（順番に実行）
- spec-knowledge の SKILL.md を Read して手順に従い specs/ を生成・同期する
- spec-screenshot の SKILL.md を Read して手順に従い画面セクションにスクリーンショットを埋め込む
- つまり、/impl-done では docs/steering/ と specs/ を同期する
- （specs/ は repo 全体の成果物のため複数エージェントに同時に触らせない）
- plans/ は更新しない（/e2e-gen 側で完了済み）
- 完了報告を出力する

---

修正サイクルのルール

```
[修正サイクル（何度でも繰り返す）]
/plan → /plan-writer → /plan-checker（任意）→ /impl → /arch-refactor
  ↺ 必要に応じて /plan または /impl に戻る

[全実装完了後の最終ゲート]
/e2e-gen → /impl-done
```

- 修正サイクル中は /e2e-gen と /impl-done を実行しない（/arch-refactor が REVIEWED を出力した時点で修正サイクルを抜けたとみなす）
- /arch-refactor で REVIEWED 後は、最終ゲートへ進む

### /plan-checker を挟む基準

以下の場合のみ実行する（それ以外はスキップ）：
- 高リスク変更（DB スキーマ変更・認証認可・外部 API 連携等）
- 判断が分かれる差分がある場合
- PRD を手動で修正した場合

ショートカットルート（バグ修正・リファクタリング）

- 設計変更を伴わない純粋なバグ修正・リファクタリングで、対象機能の PRD が既存かつ必要な計画が既に揃っている場合は、/plan と /plan-writer を省略して /impl で実装フェーズに入ってよい。最終ゲート（/e2e-gen → /impl-done）はショートカット不可
- PRD が未整備の純粋バグ修正はショートカットしない。/plan から開始し、バグ箇所・再現条件・期待挙動を明確化して plans/ に落とし込んでから、通常の修正サイクル（/plan-writer 以降）に進む
- ショートカット開始後に /arch-refactor から /plan に戻った場合は、/plan → /plan-writer を経由する通常修正サイクルで回す（/plan-writer は省略しない）

戻り先ルール

- /arch-refactor で設計変更が必要な違反を検出 → /plan に戻って修正サイクル全体（/plan から /arch-refactor REVIEWED まで）を回す
- /arch-refactor で設計変更不要な違反を検出 → /impl に戻って実装修正のみ行い、再度 /arch-refactor を実行する
- E2E 失敗（e2e/tests/ のみの修正で解消できる問題）→ /e2e-gen 内でループ継続（外部に戻らない）
- E2E 失敗（仕様・設計の問題）→ 問題内容をユーザーに報告してスキルを停止する（/plan には戻らない）
- E2E 失敗（BE / FE の実装バグが原因）→ /e2e-gen 自身は実装しない。スキル終了時に全バグ内容をまとめてユーザーに報告し /impl の実行を促す
- E2E 失敗報告を受けたユーザーが /impl に進む場合: /impl から /arch-refactor REVIEWED まで修正サイクルを完走してから再度 /e2e-gen に入る
