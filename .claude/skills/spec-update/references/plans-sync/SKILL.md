---
name: plans-sync
description: `/spec-update` の例外ルートとして、通常フローで `plans/` を直せないときだけ現コードや DB マイグレーションから PRD / schema を回復同期する。
---

# /plans-sync

## 位置づけ

`/plans-sync` は `plans/` の例外的な回復ルートとして使う。

- 修正サイクルや最終ゲートの代替にしない
- 新しい要件は決めない
- ユーザー合意の代替にしない
- 現実装の記述同期だけを行う
- 新機能の開始手順には使わない
- 用途は drift 回復・実装先行後の追従・PRD 欠落の補修に限定する

## 手順

1. AskUserQuestion でユーザーに確認する:
   - **質問**: どの操作を実行しますか？
   - **選択肢 1**: api-sync（現コードから plans/prd.md を生成・更新）
   - **選択肢 2**: schema-sync（DB マイグレーションから plans/schema.md を生成・更新）
   - **選択肢 3**: すべて更新（機能固有 PRD がある場合に api-sync → schema-sync の順に実行。shared-only タスクでは api-sync をスキップして schema-sync のみ実行）

2. 選択に応じて参照ドキュメントを読み込み、手順に従って実行する:
   - **api-sync** → [plan-writer/references/api-sync/SKILL.md](../../../plan-writer/references/api-sync/SKILL.md)
   - **schema-sync** → [plan-writer/references/schema-sync/SKILL.md](../../../plan-writer/references/schema-sync/SKILL.md)
   - **すべて更新** → api-sync → schema-sync の順に両方の手順を実行する
