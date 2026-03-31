---
name: front-context
description: sample-front サービスのコンテキスト定義。フロントエンド実装に必要なスキルと参照先を一元管理する。コンポーネント・ページ・機能の追加・変更時に自動ロードされる。
---

# sample-front コンテキスト

## 使用スキル

| スキル名 | 用途 | パス |
|---|---|---|
| `feature-sliced-design` | FSD v2.1 レイヤー構造・配置ルール・import 境界 | `sample-front/.claude/skills/feature-sliced-design/SKILL.md` |
| `vitest` | テスト設定・記述パターン・モックの書き方 | `sample-front/.claude/skills/vitest/SKILL.md` |

## 作業開始時の手順（順序厳守）

1. `sample-front/CLAUDE.md` を Read して、プロジェクトの規約・ガイドラインを把握する
2. `sample-front/docs/steering/*.md` を Read して、技術スタック・アーキテクチャを把握する
3. 下記の「Feature Sliced Design スキル」セクションを参照して FSD v2.1 のレイヤー構造・配置ルール・import 境界を把握する
4. 下記の「Vitest スキル」セクションを参照してテスト設定・記述パターン・モックの書き方を把握する

この 4 ステップは省略不可。必ず実装開始前に完了すること。

> **重要**: コンポーネント・ページ・機能の追加・変更は必ず「Feature Sliced Design スキル」の指示に従うこと。テストの追加・変更は必ず「Vitest スキル」の指示に従うこと。

---

## Feature Sliced Design スキル

@sample-front/.claude/skills/feature-sliced-design/SKILL.md

---

## Vitest スキル

@sample-front/.claude/skills/vitest/SKILL.md

> **注意**: 本ファイル内のスキル参照（`@` で始まるパス）が展開されず内容が空の場合、該当パスのファイルが存在するか Read ツールで確認すること。ファイルが存在しない場合は、ユーザーにスキルファイルの作成が必要である旨を報告し、作業を中断する。
