---
name: front-context
description: sample-front サービスのコンテキスト定義。フロントエンド実装に必要なスキルと参照先を一元管理する。
---

# sample-front コンテキスト

## 使用スキル

| スキル名 | 用途 | パス |
| --- | --- | --- |
| `feature-sliced-design` | FSD v2.1 レイヤー構造・配置ルール・import 境界 | `sample-front/.claude/skills/feature-sliced-design/SKILL.md` |
| `vitest` | テスト設定・記述パターン・モックの書き方 | `sample-front/.claude/skills/vitest/SKILL.md` |
| `apple-ui-designer` | Apple HIG 準拠の UI 設計 | `sample-front/.claude/skills/apple-ui-designer/SKILL.md` |
| `steering` | `docs/steering/` の同期・drift 検出 | `sample-front/.claude/skills/steering/SKILL.md` |

## 作業開始時の手順（順序厳守）

1. `sample-front/CLAUDE.md` を Read して、プロジェクトの規約・ガイドラインを把握する
2. `sample-front/docs/steering/*.md` を Read して、技術スタック・アーキテクチャを把握する
3. 下記の「Feature Sliced Design スキル」セクションを参照して FSD v2.1 のレイヤー構造・配置ルール・import 境界を把握する
4. 下記の「Vitest スキル」セクションを参照してテスト設定・記述パターン・モックの書き方を把握する
5. UI を実装・変更する際は下記の「Apple UI Designer スキル」セクションを参照する

この 5 ステップは省略不可。必ず実装開始前に完了すること。

## Feature Sliced Design スキル

Read ツールで `sample-front/.claude/skills/feature-sliced-design/SKILL.md` を読み込むこと。

---

## Vitest スキル

Read ツールで `sample-front/.claude/skills/vitest/SKILL.md` を読み込むこと。

---

## Apple UI Designer スキル

Read ツールで `sample-front/.claude/skills/apple-ui-designer/SKILL.md` を読み込むこと。

---

## Steering スキル

`/impl-done` などで `docs/steering/` の同期が必要な場合は、Read ツールで `.claude/skills/front-context/references/steering/SKILL.md` を読み込むこと。

---

## PRD 照合観点

- import 方向は `app -> pages -> widgets -> features -> entities -> shared` を守る
- 外部利用される slice は `index.ts` 経由で export する
- 同一レイヤー間のクロスインポートを作らない
- `shared/` にビジネスロジックを置かない
- 単一画面専用の実装は `pages/` に留め、早すぎる抽象化をしない
