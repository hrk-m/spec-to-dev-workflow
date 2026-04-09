---
inclusion: always
---

# Tech

## スタック

| カテゴリ                | 技術                                             |
| ----------------------- | ------------------------------------------------ |
| ランタイム / バンドラー | Bun                                              |
| UI ライブラリ           | React 19                                         |
| ルーティング            | react-router v7                                  |
| UI コンポーネント       | Radix UI Themes                                  |
| アイコン                | react-icons                                      |
| 言語                    | TypeScript (strict)                              |
| テスト                  | Vitest + Testing Library (jsdom)                 |
| リント                  | oxlint                                           |
| フォーマット            | Prettier + `@ianvs/prettier-plugin-sort-imports` |

## 主要な決定事項

### Bun ファースト

開発サーバー・ビルド・テスト実行をすべて Bun で統一。`bun --hot` による HMR、`bun build`
による本番バンドルを利用。

### ルーティング

react-router v7 を使用。`src/app/router.tsx` で `createBrowserRouter`
によりルート定義を一元管理し、`App.tsx` で `RouterProvider` を通じてマウントする。

### パスエイリアス

`@/` は `src/` を指す。すべての内部インポートは相対パスではなく `@/` を使う。

```ts
// Good
import { apiFetch } from "@/shared/api/client";
// Bad
import { apiFetch } from "../../shared/api/client";
```

### 環境変数

`BUN_PUBLIC_*` プレフィックスを使用。`.env` に `BUN_PUBLIC_API_URL`
を設定することで API ベース URL を上書き可能。デフォルトは `http://localhost:8080`。

### リント構成

oxlint を使用（`.oxlintrc.json`）。プラグイン: `import`, `typescript`, `unicorn`。カテゴリレベル:
`correctness: error`, `suspicious: warn`, `perf: warn`。

**エラーレベルのルール:**

- `import/no-cycle`: 循環インポート禁止
- `import/no-relative-parent-imports`: 親ディレクトリへの相対インポート禁止（`@/` エイリアスを使う）
- `typescript/no-unused-vars`: 未使用変数はエラー
- `typescript/prefer-as-const`: `as const` を推奨
- `typescript/no-inferrable-types`: 推論可能な型の明示的な注釈を禁止
- `typescript/no-unnecessary-template-expression`: 不要なテンプレートリテラルを禁止
- `eslint/require-await`: async 関数内に await が必要
- `eslint/no-param-reassign`: 関数パラメータの再代入禁止
- `eslint/no-else-return`: 不要な else ブロックを禁止（早期リターン推奨）
- `unicorn/prefer-number-properties`: `Number.isNaN` 等のプロパティ使用を推奨

**警告レベルのルール:**

- `no-console`: コンソール出力は警告
- `typescript/no-explicit-any`: `any` 型の使用は警告
- `typescript/no-non-null-assertion`: 非 null アサーション（`!`）は警告
- `typescript/consistent-type-imports`: 型インポートは `type` キーワードを推奨

**明示的に無効化しているルール:**

- `no-unused-vars`: off（`typescript/no-unused-vars` で代替）
- `import/no-named-as-default`: off
- `import/no-named-as-default-member`: off
- `import/no-unassigned-import`: off

### フォーマット構成

Prettier +
`@ianvs/prettier-plugin-sort-imports`（`.prettierrc.mjs`）でインポート順を FSD レイヤー順に自動整列。

- `printWidth: 100`, `singleQuote: false`, `semi: true`, `trailingComma: "all"`
- `tabWidth: 2`, `arrowParens: "always"`, `proseWrap: "always"`, `endOfLine: "lf"`
- インポート順: React → サードパーティ → `@/app` → `@/pages` → `@/shared` → 親相対パス(`../`)
  → 同階層相対パス(`./`)
- 注意: `@/widgets`・`@/features`・`@/entities` は `.prettierrc.mjs` の `importOrder`
  に明示指定されていないため、サードパーティと `@/app`
  の間にフォールバック配置される。FSD レイヤーを追加した際は `importOrder` への追記を忘れないこと

### テスト構成

- `vitest.config.ts` で React plugin と jsdom を設定済み
- `globals: true` により `describe`, `it`, `expect` 等をインポート不要で使用可能
- セットアップファイル: `src/test/setup.ts`（`@testing-library/jest-dom` のインポート）
- カバレッジ: `vitest run --coverage`（v8 プロバイダー、レポーター: `text` + `lcov`）

## コマンド

### bun scripts

```bash
bun dev             # 開発サーバー起動 (HMR)
bun run build       # 本番ビルド → dist/
bun test            # テスト実行
bun run test:watch  # ウォッチモード
bun run test:coverage # カバレッジ計測
bun run lint        # oxlint でリント
bun run lint:fix    # oxlint 自動修正
bun run format      # Prettier チェック
bun run format:fix  # Prettier 自動整形
bun run typecheck   # 型チェック (tsc --noEmit)
```

### Makefile ショートカット

```bash
make test           # テスト実行
make lint           # oxlint でリント
make fix            # oxlint 自動修正
make build          # 本番ビルド
make run            # 開発サーバー起動
make check          # typecheck + lint + format + test をまとめて実行
```
