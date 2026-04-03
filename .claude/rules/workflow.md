# ワークフロー

## スキルフロー

```
/plan → /plan-writer → /plan-checker（任意）→ /impl → /arch-refactor → /impl-done
```

| スキル          | 役割                                                              |
| --------------- | ----------------------------------------------------------------- |
| `/plan`         | ユーザーと対話しながら要件・設計を合意する                        |
| `/plan-writer`  | `plans/{機能名}/{verb-noun}/prd.md` に PRD を書き出す             |
| `/plan-checker` | アーキテクチャ適合チェック（任意・`/impl` 前に使う）             |
| `/impl`         | TDD でサブエージェントに実装を委譲する                            |
| `/arch-refactor`  | **`/impl` 完了後・`/impl-done` 前に実行**。スキルを絶対的な正としてアーキテクチャ違反を検出・自動修正する |
| `/impl-done`    | **全実装完了後に一回だけ実行**。steering・plans・specs を同期する |

修正が必要な場合は `/plan → /plan-writer → /impl → /arch-refactor` を繰り返し、すべて完了したら `/impl-done` を一回実行する。

## 推奨フロー

```
[設計・実装ループ（何度でも繰り返す）]

  /plan（新規 or 修正）
    ↓
  /plan-writer（PRD 新規作成 or 差分 Edit）
    ↓
  /plan-checker（任意）
    ↓
  /impl
    ↓
  /arch-refactor
    ↓
  問題なし？ ─── No ──→ /plan に戻る
    │
   Yes
    ↓
[完了後に一回だけ]

  /impl-done
```

### ルール

- `/impl-done` は「全ての実装が完了した」最後の一回だけ実行する。修正サイクル中は実行しない
- 修正サイクル中は `/plan → /plan-writer → /impl → /arch-refactor` を繰り返すだけでよい
- `/plan-writer` は差分 Edit 対応済みのため、PRD の更新箇所だけが書き換わる

### ドキュメントの責務分離

| ディレクトリ | 内容                   | 管理スキル     |
| ------------ | ---------------------- | -------------- |
| `plans/`     | 技術的な設計意図（PRD）| `/plan-writer` |
| `specs/`     | 実装済みの UX ドキュメント | `/impl-done` |
