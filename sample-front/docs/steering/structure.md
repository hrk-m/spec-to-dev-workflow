---
inclusion: always
---

# Structure

## Feature-Sliced Design v2.1

`src/`
配下は FSD レイヤーで構成される。レイヤーの依存方向は上から下のみ（下位レイヤーは上位を参照しない）。

```
src/
  index.ts      ← Bun エントリーポイント（サーバー起動）
  index.html    ← HTML テンプレート
  app/          ← アプリ初期化・ルーティング・グローバルスタイル・React マウント
  pages/        ← ルート単位のページコンポーネント
  widgets/      ← 独立した UI ブロック（Header・Sidebar 等）
  shared/       ← インフラ（API クライアント・設定・UI キット・テーマ）
  test/         ← テストセットアップ
```

## 各レイヤーのパターン

### `app/`

- `index.tsx` — React DOM のマウント（`StrictMode` + `createRoot` +
  `render`）。HMR 対応（`import.meta.hot` による root の再利用）
- `App.tsx` — ルートコンポーネント。App Shell パターン（`Header` + `Sidebar` + `RouterProvider`）で構成
- `router.tsx` — `createBrowserRouter` によるルート定義（`/`, `/groups`, `/groups/:id`）
- `styles/index.css` — グローバルスタイル

### `pages/<page-name>/`

- `index.ts` — Public API（barrel export）。**外部からは必ずここを経由してインポートする**
- `ui/<Component>.tsx` — ページコンポーネント本体
- `ui/__tests__/` — ページのテスト
- `api/` — ページ固有の API 通信ロジック（必要に応じて配置）
- `model/` — ページ固有の型定義・ドメインモデル（必要に応じて配置）

**現在のページスライス:**

| スライス       | 状態 |
| -------------- | ---- |
| `home`         | 実装済み（`HomePage` + `GroupList` コンポーネント、`api/fetch-groups.ts`、`model/group.ts`、`model/useGroupList.ts`、`GroupList.styles.ts`、テスト） |
| `group-detail` | 実装済み（`GroupDetailPage` + `MemberList` コンポーネント、`api/fetch-group.ts`、`api/fetch-group-members.ts`、`model/group-detail.ts`、`model/useGroupDetail.ts`、`model/useMemberList.ts`、スタイル、テスト） |

### `widgets/`

FSD の widgets レイヤー。ページ横断で使われる独立した UI ブロックを配置する。

- `header/` — アプリヘッダー（ハンバーガーメニューボタン付き）。`ui/Header.tsx`、`ui/Header.styles.ts`、テスト
- `sidebar/` — サイドバーナビゲーション（オーバーレイ付きドロワー）。`ui/Sidebar.tsx`、`ui/Sidebar.styles.ts`、テスト

各 widget は `index.ts`（barrel export）を Public API として公開する。

### `shared/`

- `api/client.ts` — 汎用 fetch ラッパー（`apiFetch<T>`）。レスポンスエラー検知・JSON 変換を担う
- `config/env.ts` — 環境変数の集約・エクスポート（`API_BASE_URL`）
- `ui/index.ts` — 共通 UI コンポーネントの barrel export
- `ui/PageContainer.tsx` — 全ページ共通のコンテンツラッパー（パディング制御）
- `ui/theme.ts` — アプリ共通のカラーパレット（`appColors`）
- `api/__tests__/` / `config/__tests__/` — shared のテスト

### `test/`

- `setup.ts` — Vitest のグローバルセットアップ（`@testing-library/jest-dom` のインポート）

## インポート規則

1. **レイヤー間**: 上位レイヤーのみ下位をインポート可能（`app` → `widgets` → `pages` → `shared`）

   ```ts
   // app → widgets は OK
   import { Header } from "@/widgets/header";

   // pages → shared は OK
   import { apiFetch } from "@/shared/api/client";

   // shared → pages は NG
   // widgets → pages は NG
   ```

2. **スライス間**: 同一レイヤー内での相互インポートは禁止。Public
   API（`index.ts`）を通じてのみ参照する

3. **パスエイリアス**: `@/` を使い、相対パス `../` での上位ディレクトリ参照を避ける

## 新規ファイルの配置基準

| 何を作るか                       | 配置先                                                 |
| -------------------------------- | ------------------------------------------------------ |
| ページコンポーネント             | `src/pages/<name>/ui/` + `src/pages/<name>/index.ts`   |
| ページ横断の独立 UI ブロック     | `src/widgets/<name>/ui/` + `src/widgets/<name>/index.ts` |
| API 通信ロジック（共通）         | `src/shared/api/`                                      |
| 環境設定・定数                   | `src/shared/config/`                                   |
| 再利用 UI パーツ・テーマ         | `src/shared/ui/`                                       |
| アプリ全体の初期化・ルーティング | `src/app/`                                             |
