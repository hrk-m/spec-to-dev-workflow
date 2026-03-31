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
3. 以下のスキルを呼び出して FSD v2.1 のレイヤー構造・配置ルール・import 境界を把握する

   ```
   Skill(skill: "feature-sliced-design")
   ```

4. 以下のスキルを呼び出してテスト設定・記述パターン・モックの書き方を把握する

   ```
   Skill(skill: "vitest")
   ```

この 4 ステップは省略不可。必ず実装開始前に完了すること。

> **重要**: コンポーネント・ページ・機能の追加・変更は必ず `feature-sliced-design` スキルの指示に従うこと。テストの追加・変更は必ず `vitest` スキルの指示に従うこと。

## PRD 照合観点

`plan-checker` がフロントエンドの実装方針を確認するときは、このセクションを正とする。
各観点の詳細根拠は `feature-sliced-design` と `vitest`、必要に応じて `sample-front/docs/steering/*.md` を参照して判断する。

### FRONT-1. レイヤー選定

確認ポイント:

- まず `pages/` に置く方針になっているか
- `widgets/`, `features/`, `entities/` を使う場合、2 か所以上での再利用理由があるか
- `shared/`, `pages/`, `app/` の最小構成で十分なケースで過剰抽出していないか

### FRONT-2. import 方向と Public API

確認ポイント:

- import 方向が `app → pages → widgets → features → entities → shared` を守っているか
- 同一 layer の slice 間 import を前提にしていないか
- `pages/widgets/features/entities` の各 slice が `index.ts` を Public API にしているか
- 内部ファイルへの deep import を前提にしていないか

### FRONT-3. shared の責務

確認ポイント:

- `shared/` に infra のみを置く前提になっているか
- CRUD / API client が `shared/api/` に置かれているか
- business logic や画面固有ロジックを `shared/` に逃がしていないか

### FRONT-4. slice 設計

確認ポイント:

- 単一ページ専用の UI / state / validation を無理に `features` や `entities` へ抽出していないか
- `types.ts`, `utils.ts`, `helpers.ts` のような技術役割名だけの分割を前提にしていないか
- `insignificant-slice` になりそうな薄い slice を増やしていないか

### FRONT-5. テスト方針

確認ポイント:

- テストランナーが Vitest 前提になっているか
- テスト配置が選択した FSD 構成と矛盾していないか
- モック対象が `shared/api` などの境界に揃っているか
- テストが Public API を無視した deep import 前提になっていないか

## plan-checker での扱い

- `plan-checker` はフロントエンド詳細チェックをこのファイルに依存して実施する
- 不一致を見つけた場合は、このファイルと `feature-sliced-design` / `vitest` を根拠に差異を説明する
- スキル定義と現コードが矛盾する場合は、PRD を現コード寄せにせず `skill-definition conflict` として扱う
