---
inclusion: always
---

# Structure

## Feature-Sliced Design v2.1

`src/`
配下は FSD レイヤーで構成される。レイヤーの依存方向は上から下のみ（下位レイヤーは上位を参照しない）。

```
src/
  index.ts      ← Bun エントリーポイント（サーバー起動 + /api/* プロキシ）
  index.html    ← HTML テンプレート
  app/          ← アプリ初期化・ルーティング・グローバルスタイル・React マウント
    routes/     ← ルート固有のレイアウトコンポーネント
  pages/        ← ルート単位のページコンポーネント
  widgets/      ← 独立した UI ブロック（Header・Sidebar 等）
  shared/       ← インフラ（API クライアント・設定・UI キット・テーマ・ライブラリ）
    lib/        ← 汎用ロジック（sheet-stack 等）
  test/         ← テストセットアップ
```

## 各レイヤーのパターン

### `app/`

- `index.tsx` — React DOM のマウント（`StrictMode` + `createRoot` + `render`）。Radix UI
  `Theme`（`appearance="light"`, `accentColor="gray"`, `grayColor="slate"`,
  `radius="large"`）でアプリ全体をラップ。HMR 対応（`import.meta.hot` による root の再利用）
- `App.tsx` — ルートコンポーネント。App Shell パターン（`Header` + `Sidebar` +
  `RouterProvider`）で構成。Sidebar 開閉時に
  `RemoveScrollBar`（`react-remove-scroll-bar`）でスクロールバーを非表示化
- `router.tsx` — `createBrowserRouter` によるルート定義。最上位で `SheetStackProvider`
  をラップし、`GroupNavigationLayout` が `/`・`/groups`・`/groups/:id`
  のルーティングを制御する。各ルートの `element`
  は空フラグメント（実際の描画は Layout コンポーネントが担う）
- `routes/GroupNavigationLayout.tsx`
  — シートナビゲーションのルーティングロジック。`location.state.presentation === "sheet"` の場合は
  `HomePage` を `inert` 属性で背面に残しつつ `GroupDetailSheet`
  をシートで表示。それ以外は通常のフルページ遷移（`GroupDetailPage`）。子シート（メンバー詳細）が開いている場合はグループ詳細シートを
  `fullWidth` に拡大して同時クローズアニメーションに対応する
- `styles/index.css` — グローバルスタイル。CSS 変数 `--header-height: 52px` の定義、Radix
  Dialog のオーバーレイ z-index 調整（`.rt-BaseDialogOverlay { z-index: 200 }`）、スクロールバー非表示時のヘッダー幅補正（`--removed-body-scroll-bar-size`）、`prefers-reduced-motion`
  でアニメーション・トランジション無効化を含む

### `pages/<page-name>/`

- `index.ts` — Public API（barrel export）。**外部からは必ずここを経由してインポートする**
- `ui/<Component>.tsx` — ページコンポーネント本体
- `ui/__tests__/` — UI コンポーネントのテスト
- `api/` — ページ固有の API 通信ロジック（必要に応じて配置）
- `model/` — ページ固有の型定義・ドメインモデル・カスタムフック（必要に応じて配置）
- `model/__tests__/` — モデル層のテスト（カスタムフック等）

**現在のページスライス:**

| スライス       | 状態                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home`         | 実装済み（`HomePage` + `GroupList` + `CreateGroupDialog` コンポーネント、`api/fetch-groups.ts`、`api/create-group.ts`、`model/group.ts`（型定義）、`model/group-list.ts`（`useGroupList` フック）、`model/group-create.ts`（`useCreateGroup` フック）、`GroupList.styles.ts`、`CreateGroupDialog.styles.ts`、テスト）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `group-detail` | 実装済み（`GroupDetailPage` + `GroupDetailSheet` + `GroupDetailView` + `GroupDetailContent` + `EditGroupDialog` + `MemberDetailSheet` + `MemberList` コンポーネント、`api/fetch-group.ts`、`api/fetch-group-members.ts`、`api/update-group.ts`（PUT リクエスト）、`model/group-detail.ts`（型定義）、`model/group-update.ts`（`UpdateGroupRequest` 型）、`model/group-detail-state.ts`（`useGroupDetail` フック。`refetch` を返す）、`model/useUpdateGroup.ts`（`useUpdateGroup` フック）、`model/member-list.ts`（`useMemberList` フック）、スタイル、テスト）。`GroupDetailView` がフルページとシート表示の共通描画ロジックを担い、`GroupDetailSheet`・`GroupDetailPage` はそれぞれの表示コンテキスト固有のラッパー。`GroupDetailContent` が Edit ボタンと `EditGroupDialog` を統合し、編集成功時に `useGroupDetail.refetch` でキャッシュをクリアして再取得する |

### `widgets/`

FSD の widgets レイヤー。ページ横断で使われる独立した UI ブロックを配置する。

- `header/` — アプリヘッダー（ハンバーガーメニューボタン付き、`z-index: 150`
  で Sheet オーバーレイより上に固定）。`ui/Header.tsx`、`ui/Header.styles.ts`、テスト
- `sidebar/`
  — サイドバーナビゲーション（オーバーレイ付きドロワー）。`ui/Sidebar.tsx`、`ui/Sidebar.styles.ts`、テスト。Props:
  `isOpen`・`onClose`（必須）、`onNavigate`（任意）。"Groups" ボタンをクリックすると `onClose()` と
  `onNavigate?.()` の両方を呼び出す。`App.tsx` では `onNavigate={() => router.navigate("/")}`
  を渡してトップページへ遷移させる

各 widget は `index.ts`（barrel export）を Public API として公開する。

### `shared/`

- `api/client.ts` — 汎用 fetch ラッパー（`apiFetch<T>`）。レスポンスエラー検知・JSON 変換を担う
- `config/env.ts` — 環境変数の集約・エクスポート（`API_BASE_URL`
  は空文字列。サーバーサイドプロキシ経由のため同一オリジン）
- `lib/sheet-stack/`
  — シートスタック管理。`SheetStackProvider`（コンテキスト提供 + シートレンダリング）、`SheetStackContext`（型定義 +
  `useSheetStack` フック）、`index.ts`（barrel export）で構成
- `ui/index.ts` — 共通 UI コンポーネントの barrel
  export（`PageContainer`、`Sheet`、`sheetConstants`、`appColors`）
- `ui/PageContainer.tsx` — 全ページ共通のコンテンツラッパー（パディング制御）
- `ui/Sheet.tsx` — 右からスライドインするモーダルパネル。`createPortal`
  で描画、スクロールロック・ESC キー・オーバーレイクリックによるクローズ、トランジション完了後の DOM 除去を内包する
- `ui/Sheet.styles.ts` —
  Sheet のスタイル定数とスタイルオブジェクト（アニメーション設定・z-index ベース値・サイズ定数を
  `sheetConstants` として export）
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

## データフローパターン

### クライアントキャッシュ + ページネーション

一覧系画面（グループ一覧・メンバー一覧）は共通のデータフローパターンに従う:

1. **一括取得**: API から `FETCH_LIMIT`（500 件）単位でデータを取得し、ローカルにキャッシュ
2. **クライアント側ページ分割**: キャッシュ済みデータを
   `perPage`（20/50/100 件切り替え可能）で slice して表示
3. **遅延追加取得**:
   `lastBatchSize === FETCH_LIMIT`（前回取得が上限件数）かつ表示範囲がキャッシュを超える場合のみ、次の 500 件を追加取得。`lastBatchSize`
   が `FETCH_LIMIT` 未満であればデータ末尾と判断し追加取得しない
4. **検索**: 入力値を 300ms デバウンス（`debouncedQuery`）してからキャッシュをクリアし、offset
   0から再取得。検索中の `effectiveTotal`
   はキャッシュ済み件数（`cachedItems.length`）を使い、非検索時は API レスポンスの `total` を使う
5. **ページネーション表示条件**: 表示アイテムが 1 件以上（`items.length > 0`）の場合にページネーション UI を表示する
6. **件数ラベル**: ローディング中は "Loading..." 系メッセージ、`effectiveTotal > 0`
   で件数表示、`effectiveTotal === 0` で "No ... found" を表示する（`useGroupList` の
   `groupCountLabel` パターン）

このパターンは `useGroupList` と `useMemberList`
の両カスタムフックで実装されている。新しい一覧画面を追加する場合は同パターンに従うこと。

### 詳細画面の refetch パターン

詳細画面の更新操作（編集・削除等）が成功した後、表示データを最新に保つためのパターン:

1. **キャッシュクリア + 再フェッチ**: `useGroupDetail` の `refetch`
   はキャッシュから対象 ID を削除し、`refetchKey` をインクリメントすることで `useEffect`
   を再実行する
2. **楽観的更新なし**: 更新 API の成功を待ってからキャッシュをクリアし、サーバーの最新値を取得する設計
3. **呼び出し方**: 編集ダイアログの `onSuccess` コールバックとして `refetch`
   を渡す。ダイアログはクローズ後に呼び出す

```ts
// useGroupDetail が返す refetch
const refetch = useCallback(() => {
  groupDetailCache.delete(groupId);
  setRefetchKey((prev) => prev + 1);
}, [groupId]);
```

## 新規ファイルの配置基準

| 何を作るか                           | 配置先                                                   |
| ------------------------------------ | -------------------------------------------------------- |
| ページコンポーネント                 | `src/pages/<name>/ui/` + `src/pages/<name>/index.ts`     |
| ページ横断の独立 UI ブロック         | `src/widgets/<name>/ui/` + `src/widgets/<name>/index.ts` |
| API 通信ロジック（共通）             | `src/shared/api/`                                        |
| 環境設定・定数                       | `src/shared/config/`                                     |
| 汎用ロジック・コンテキスト           | `src/shared/lib/<name>/` + `index.ts`（barrel export）   |
| 再利用 UI パーツ・テーマ             | `src/shared/ui/`                                         |
| ルート固有のレイアウトコンポーネント | `src/app/routes/`                                        |
| アプリ全体の初期化・ルーティング     | `src/app/`                                               |
