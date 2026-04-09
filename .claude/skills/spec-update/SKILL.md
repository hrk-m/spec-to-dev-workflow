---
name: spec-update
description: 通常フロー外でドキュメントだけを手動更新したいときに、`/spec-update` から `plans-sync`・`spec-knowledge`・`spec-screenshot` を選んで実行する。
---

# spec-update

通常フロー外で docs だけを更新したいときの補助スキル。
`plans/` の回復は `plans-sync` だけが担当し、`spec-knowledge` / `spec-screenshot` は `specs/` 専用とする。
通常フローでは `plans/` の最終同期を `/e2e-gen`、`steering` / `specs/` の最終同期を `/impl-done` が担当する。

## 位置づけ

- 修正サイクルや最終ゲートの代替にしない
- 新しい要件の合意や新機能の開始には使わない
- `plans-sync` は drift 回復・実装先行後の追従・PRD 欠落補修のときだけ使う
- `spec-knowledge` / `spec-screenshot` は、収束後に `specs/` だけを手動再同期したいときに使う
- 実装が未収束で `/plan` または `/impl` に戻る可能性がある場合は、このスキルではなく通常フローへ戻る

## 手順

1. AskUserQuestion でユーザーに確認する:
   - **質問**: どの操作を実行しますか？
   - **選択肢 1**: spec-knowledge（`specs/` の生成・同期。通常は `/impl-done` が実行）
   - **選択肢 2**: spec-screenshot（収束済みで `specs/` の画面セクションだけ再同期したい場合。通常は `/impl-done` が実行）
   - **選択肢 3**: plans-sync（`plans/` の例外的回復。新機能の開始には使わない）

2. 選択に応じて参照ドキュメントを読み込み、手順に従って実行する:
   - **spec-knowledge** → [references/spec-knowledge/SKILL.md](./references/spec-knowledge/SKILL.md)
   - **spec-screenshot** → [references/spec-screenshot/SKILL.md](./references/spec-screenshot/SKILL.md)
   - **plans-sync** → [references/plans-sync/SKILL.md](./references/plans-sync/SKILL.md)
