---
inclusion: always
---

# Structure

## Feature-Sliced Design v2.1

`src/` 配下は FSD レイヤーで構成される。レイヤーの依存方向は上から下のみ（下位レイヤーは上位を参照しない）。

```
src/
  app/        ← アプリ初期化・グローバルスタイル・エントリーポイント
  pages/      ← ルート単位のページコンポーネント
  shared/     ← インフラ（API クライアント・設定・UI キット）
  test/       ← テストセットアップ
```

## 各レイヤーのパターン

### `app/`
- `index.tsx` — React DOM のマウント
- `App.tsx` — ルートコンポーネント（ページのルーティングを担う）
- `styles/index.css` — グローバルスタイル

### `pages/<page-name>/`
- `index.ts` — Public API（barrel export）。**外部からは必ずここを経由してインポートする**
- `ui/<Component>.tsx` — ページコンポーネント本体
- `ui/__tests__/` — ページのテスト

**現在のページスライス:**
| スライス | 状態 |
|---|---|
| `home` | 実装済み（`HomePage` コンポーネント + テスト） |
| `todo` | スケルトンのみ（ディレクトリ構造のみ、ファイルなし） |
| `todo-create` | スケルトンのみ（ディレクトリ構造のみ、ファイルなし） |
| `todo-list` | スケルトンのみ（ディレクトリ構造のみ、ファイルなし） |

### `shared/`
- `api/client.ts` — 汎用 fetch ラッパー（`apiFetch<T>`）。レスポンスエラー検知・JSON 変換を担う
- `config/env.ts` — 環境変数の集約・エクスポート（`API_BASE_URL`）
- `api/__tests__/` / `config/__tests__/` — shared のテスト

### `test/`
- `setup.ts` — Vitest のグローバルセットアップ（`@testing-library/jest-dom` のインポート）

## インポート規則

1. **レイヤー間**: 上位レイヤーのみ下位をインポート可能
   ```ts
   // pages → shared は OK
   import { apiFetch } from "@/shared/api/client";
   // shared → pages は NG
   ```

2. **スライス間**: 同一レイヤー内での相互インポートは禁止。Public API（`index.ts`）を通じてのみ参照する

3. **パスエイリアス**: `@/` を使い、相対パス `../` での上位ディレクトリ参照を避ける

## 新規ファイルの配置基準

| 何を作るか | 配置先 |
|---|---|
| ページコンポーネント | `src/pages/<name>/ui/` + `src/pages/<name>/index.ts` |
| API 通信ロジック | `src/shared/api/` |
| 環境設定・定数 | `src/shared/config/` |
| 再利用 UI パーツ | `src/shared/ui/` |
| アプリ全体の初期化処理 | `src/app/` |
