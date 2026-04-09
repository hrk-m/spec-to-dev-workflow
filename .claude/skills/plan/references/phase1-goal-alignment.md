# Phase 1 — 目的・ゴールの合意

> 影響 plans の確認（Glob + AskUserQuestion multiSelect）は SKILL.md の「影響 plans の確認」ステップで完了済み。

1. ユーザーの入力と選択された plans の仕様から **目的**（なぜ作るか）と **ゴール**（完成した状態）を引き出す
   - 不明な場合は推測せず `AskUserQuestion` で確認する
   - PRD 未整備の純粋バグ修正では、ここで不具合箇所・再現条件・期待挙動を明確化し、目的・ゴールに含める
2. 目的・ゴールをチャットに整理して提示し、`AskUserQuestion` でユーザーの最終合意を得る
   - 合意が取れるまで Phase 2 に進めない
