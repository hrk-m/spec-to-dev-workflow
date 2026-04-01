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
| `apple-ui-designer` | Apple HIG準拠のモバイルUI設計・iOS-nativeコンポーネント設計 | `sample-front/.claude/skills/apple-ui-designer/SKILL.md` |

## 作業開始時の手順（順序厳守）

1. `sample-front/CLAUDE.md` を Read して、プロジェクトの規約・ガイドラインを把握する
2. `sample-front/docs/steering/*.md` を Read して、技術スタック・アーキテクチャを把握する
3. 下記の「Feature Sliced Design スキル」セクションを参照して FSD v2.1 のレイヤー構造・配置ルール・import 境界を把握する
4. 下記の「Vitest スキル」セクションを参照してテスト設定・記述パターン・モックの書き方を把握する
5. UI を実装・変更する際は下記の「Apple UI Designer スキル」セクションを参照して Apple HIG に従ったデザインを行う

この 5 ステップは省略不可。必ず実装開始前に完了すること。

> **重要**: コンポーネント・ページ・機能の追加・変更は必ず「Feature Sliced Design スキル」の指示に従うこと。テストの追加・変更は必ず「Vitest スキル」の指示に従うこと。UI の設計・実装は必ず「Apple UI Designer スキル」の指示に従うこと。

---

## Feature Sliced Design スキル

Read ツールで `.claude/skills/front-context/references/feature-sliced-design/SKILL.md` を読み込むこと。

---

## Vitest スキル

Read ツールで `.claude/skills/front-context/references/vitest/SKILL.md` を読み込むこと。

---

## Apple UI Designer スキル

Read ツールで `.claude/skills/front-context/references/apple-ui-designer/SKILL.md` を読み込むこと。
