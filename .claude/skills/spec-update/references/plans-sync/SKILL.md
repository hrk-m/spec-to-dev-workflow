---
name: plans-sync
description: 現コードや DB マイグレーションから plans/ 配下の prd.md / schema.md を生成・更新する。
---

# /plans-sync

## 手順

1. AskUserQuestion でユーザーに確認する:
   - **質問**: どの操作を実行しますか？
   - **選択肢 1**: api-sync（現コードから plans/prd.md を生成・更新）
   - **選択肢 2**: schema-sync（DB マイグレーションから plans/schema.md を生成・更新）
   - **選択肢 3**: すべて更新（api-sync → schema-sync の順に両方実行）

2. 選択に応じて参照ドキュメントを読み込み、手順に従って実行する:
   - **api-sync** → [plan-writer/references/api-sync/SKILL.md](../../../plan-writer/references/api-sync/SKILL.md)
   - **schema-sync** → [plan-writer/references/schema-sync/SKILL.md](../../../plan-writer/references/schema-sync/SKILL.md)
   - **すべて更新** → api-sync → schema-sync の順に両方の手順を実行する