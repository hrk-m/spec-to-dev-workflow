# /plan — 要件定義・設計コマンド

<background_information>

**Mission**: ユーザーと対話しながら「何を・なぜ・どう作るか」を決め切る。

**Success Criteria**:
- 機能の目的・ゴールがユーザーと合意されている
- 機能名が確定している
- 要件が `specs/{機能名}/README.md` に整理されている
- API エンドポイント・リクエスト/レスポンス・処理フローが確定している
- ユーザーがフロー確定に同意してから specs を書き出している

</background_information>

<instructions>

## Core Task

`$ARGUMENTS` を起点にユーザーと会話しながら目的・ゴール・フローを段階的に確定し、`prd` スキルで要件を整理して `specs/{機能名}/README.md` に書き出す。

---

## 実行手順（この順序で必ず行う）

### Phase 1 — 目的・ゴールの合意

1. `$ARGUMENTS` が空なら `AskUserQuestion` で「どんな機能を作りたいか」を自由記述で聞く
2. ユーザーの入力から **目的**（なぜ作るか）と **ゴール**（完成した状態）を引き出す
   - 不明な場合は推測せず `AskUserQuestion` で確認する
   - 例: 「この機能で誰が何を解決できますか？」「完成したとき何ができていれば OK ですか？」
3. 目的・ゴールをチャットに整理して提示し、ユーザーの合意を得る
   - 合意が取れるまで Phase 2 に進めない

### Phase 2 — フローの設計と確定

4. 目的・ゴールをもとに API フロー（エンドポイント・リクエスト/レスポンス・処理順序）の案を提示する
5. `AskUserQuestion` でフローの合意を取る
   - 「このフローで進めますか？」「変えたい部分はありますか？」
   - 修正があれば反映して再提示し、合意が取れるまで繰り返す
6. フロー確定後に機能名を英小文字 kebab-case で決定する
   - 例: `ユーザー管理機能` → `user-management`

### Phase 3 — specs への書き出し

7. 合意した内容のみ `specs/{機能名}/README.md` に反映する
8. 要件確定後の次アクションとして `/steering` を明示する

---

## ドキュメント構造

```text
specs/
  {機能名}/
    README.md    # 機能全体の概要・データモデル・API 設計
    create.md    # 登録処理の仕様・フロー
    update.md    # 更新処理の仕様・フロー
    list.md      # 一覧取得の仕様・フロー
    get.md       # 単件取得の仕様・フロー
    delete.md    # 削除処理の仕様・フロー
```

---

## 制約

- `prd` スキルを必ず使う
- 不明点は推測で埋めない。必ず `AskUserQuestion` で確認する
- 目的・ゴール・フローの合意が取れるまで specs を書き出さない
- 既存 spec がある場合は上書きより追記・統合を優先する
- 要件の一次情報は `specs/{機能名}/README.md`

---

## フォールバック

| 状況 | 対応 |
| --- | --- |
| `$ARGUMENTS` が空 | `AskUserQuestion` で作りたい機能を自由記述で確認 |
| 目的・ゴールが曖昧 | `AskUserQuestion` で深掘りして合意が取れるまで確定しない |
| フローに不明点がある | `AskUserQuestion` で確認が取れるまで次フェーズに進めない |
| 回答が空・未選択 | 推測で進めず質問を再提示する |
| README.md が未存在 | 新規作成する |

</instructions>

## ツール案内

- **Glob / Read**: 既存 `specs/` の確認
- **AskUserQuestion**: 目的・ゴール・フローの合意取得（各フェーズで使用）
  - 選択肢のどれも該当しない場合、ユーザーは自動的に表示される **"Other"** を選んで自由テキストを入力できる
  - `options` に "Other" を手動追加する必要はない（ツールが自動付与する）
  - ユーザーが "Other" を選択した場合は、入力内容を要件に反映してから次フェーズへ進む
- **Write / Edit**: `specs/{機能名}/README.md` の作成・更新

## 出力形式

チャットサマリーのみ（ファイルは直接更新）。

```text
## Feature Name: {機能名}
## Purpose: {目的}
## Goal: {ゴール}
## Requirements Review: 不足・矛盾・確定事項
## Updated File: specs/{機能名}/README.md
## Next Step: /steering
```
