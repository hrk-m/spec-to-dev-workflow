---
inclusion: always
---

# Tech

## スタック

| カテゴリ | 技術 |
|---|---|
| ランタイム / バンドラー | Bun |
| UI ライブラリ | React 19 |
| 言語 | TypeScript (strict) |
| テスト | Vitest + Testing Library (jsdom) |
| リント | oxlint |
| フォーマット | Prettier + `@ianvs/prettier-plugin-sort-imports` |

## 主要な決定事項

### Bun ファースト
開発サーバー・ビルド・テスト実行をすべて Bun で統一。`bun --hot` による HMR、`bun build` による本番バンドルを利用。

### パスエイリアス
`@/` は `src/` を指す。すべての内部インポートは相対パスではなく `@/` を使う。

```ts
// Good
import { apiFetch } from "@/shared/api/client";

// Bad
import { apiFetch } from "../../shared/api/client";
```

### 環境変数
`BUN_PUBLIC_*` プレフィックスを使用。`.env` に `BUN_PUBLIC_API_URL` を設定することで API ベース URL を上書き可能。デフォルトは `http://localhost:8080`。

### テスト構成
- `vitest.config.ts` で React plugin と jsdom を設定済み
- セットアップファイル: `src/test/setup.ts`（`@testing-library/jest-dom` のインポート）
- カバレッジ: `vitest run --coverage`（v8 プロバイダー）

## コマンド

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
