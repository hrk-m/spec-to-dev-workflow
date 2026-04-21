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
  entities/     ← ドメインエンティティ（型定義・Pure モデル）
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
- `router.tsx` — `createBrowserRouter` によるルート定義。最上位の `Layout` コンポーネントが
  `AuthProvider` と `SheetStackProvider` でアプリ全体をラップ。`/service-unavailable`
  は認証ガード外に配置。認証が必要なルートは `ProtectedRoute` でラップされ、その内側で
  `GroupNavigationLayout` が `/`・`/groups`・`/groups/:id`・`/users`
  のルーティングを制御する。各ルートの `element`
  は空フラグメント（実際の描画は Layout コンポーネントが担う）
- `routes/ProtectedRoute.tsx` — 認証ガードコンポーネント。`GET /api/v1/me`
  でセッション確認し、認証済みなら子をレンダリング。未認証・API 障害時は `location.state.reason`
  を付与して `/service-unavailable` へリダイレクト
- `routes/GroupNavigationLayout.tsx`
  — シートナビゲーションのルーティングロジック。`useMatch("/users")` にマッチする場合は `UsersPage`
  を返す。`useMatch("/groups/:id")` にマッチかつ `location.state.presentation === "sheet"` の場合は
  `HomePage` を `inert` 属性で背面に残しつつ `GroupDetailSheet`
  をシートで表示。それ以外は通常のフルページ遷移（`GroupDetailPage` または
  `HomePage`）。子シート（メンバー詳細）が開いている場合はグループ詳細シートを `fullWidth`
  に拡大して同時クローズアニメーションに対応する。ルート切り替え時（`routeKey` の変更）に
  `closeAll()` でシートスタックをリセットする。`GroupDetailRouteSheet`
  は ↔ ボタン（`TbArrowsHorizontal` アイコン）を `headerActions` として `Sheet` に渡し、クリック時に
  `navigate('/groups/:id', { replace: true })` を呼び出してフルページ表示に切り替える
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

| スライス              | 状態                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home`                | 実装済み（`HomePage` + `GroupList` + `CreateGroupDialog` コンポーネント、`api/fetch-groups.ts`、`api/create-group.ts`、`model/group.ts`（型定義）、`model/group-list.ts`（`useGroupList` フック・`FETCH_LIMIT` 定数（100）・`clearGroupListCache` 関数・`prependGroupToGroupListCache` 関数を export。`useGroupList` は `groupCountLabel`（グループ件数ラベル）・`sentinelRef`（IntersectionObserver 用センチネル要素）も返す）、`model/useCreateGroup.ts`（`useCreateGroup` フック）、`GroupList.styles.ts`（テーブル用スタイル定数: `tableRoot`, `tableHeader`, `tableHeaderCell`, `tableHeaderCellId`, `tableRow`, `tableRowLast`, `tableCellId`, `tableCellName`, `tableCellDescription`, `tableCellCount`, `skeletonCell`, `skeletonLine` 等）、`CreateGroupDialog.styles.ts`、テスト）。`GroupList` はネイティブ `<table>` で ID / グループ名 / 説明 / メンバー数 の 4 列を表示し、アバターアイコンは使用しない。ローディング中はスケルトン行（5 行）を表示し、空状態は `groupCountLabel` の "No groups found" で表現する                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `users`               | 実装済み（`UsersPage` + `UserList` コンポーネント、`api/fetch-users.ts`、`model/user.ts`（`User` 型: `id: number`, `uuid: string`, `first_name: string`, `last_name: string`）、`model/user-list.ts`（`useUserList` フック・`FETCH_LIMIT` 定数（100）・`clearUserListCache` 関数を export。`useUserList` はクライアントキャッシュ + IntersectionObserver 無限スクロール + 300ms デバウンス検索 + `userCountLabel`（ユーザー件数ラベル）+ `sentinelRef`（センチネル要素）も返す）、`UserList.styles.ts`（テーブル用スタイル定数: `tableRoot`, `tableHeader`, `tableHeaderCell`, `tableRow`, `tableRowLast`, `tableCellId`, `tableCellUuid`, `tableCellName`, `skeletonCell`, `skeletonLine` 等）、テスト）。`UserList` はネイティブ `<table>` で id / uuid / 姓名 の 3 列を表示し、アバターアイコンは使用しない。ローディング中はスケルトン行（3 行）を表示し、空状態は `userCountLabel` の "No users found" で表現する                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `service-unavailable` | 実装済み（`ServiceUnavailablePage`。マウント時に `GET /api/v1/me` を再試行し、成功時は `/` へリダイレクト。失敗時はメンテナンス中メッセージを表示。`ProtectedRoute` からの `location.state.reason` は現時点では表示に使用していない）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `group-detail`        | 実装済み（`GroupDetailPage` + `GroupDetailSheet` + `GroupDetailView` + `GroupDetailContent` + `EditGroupDialog` + `DeleteGroupDialog` + `AddMemberSheet` + `MemberDetailSheet` + `MemberList` コンポーネント、`api/fetch-group.ts`、`api/fetch-group-members.ts`、`api/update-group.ts`（PUT リクエスト）、`api/delete-group.ts`（DELETE リクエスト。`apiFetch<void>` を使用し 204 No Content を受け取る）、`api/fetch-non-members.ts`（`GET /api/v1/groups/:id/non-members`。`FetchNonMembersParams` / `NonMembersResponse` 型を export）、`api/add-group-members.ts`（`POST /api/v1/groups/:id/members`。`AddGroupMembersParams` / `AddGroupMembersResponse` 型を export）、`api/delete-group-members.ts`（`DELETE /api/v1/groups/:id/members`。`DeleteGroupMembersParams` 型を export。リクエストボディ `{ user_ids: number[] }` で複数メンバーを一括削除。`apiFetch<void>` を使用）、`model/group-detail.ts`（型定義）、`model/group-update.ts`（`UpdateGroupRequest` 型）、`model/group-detail-state.ts`（`useGroupDetail` フック・`clearGroupDetailCache` 関数を export。`refetch` はキャッシュから対象 ID を削除して再フェッチする）、`model/useUpdateGroup.ts`（`useUpdateGroup` フック）、`model/useDeleteGroup.ts`（`useDeleteGroup` フック）、`model/member-list.ts`（`useMemberList` フック・`FETCH_LIMIT` 定数（100）・`clearMemberListCache` 関数を export。クライアントキャッシュ + IntersectionObserver 無限スクロール + 300ms デバウンス検索）、`model/useNonMemberList.ts`（`useNonMemberList` フック・`FETCH_LIMIT` 定数（100）・`clearNonMemberListCache(groupId?: number)` 関数を export。引数なしで全キャッシュクリア、`groupId` を渡すと対象グループのキャッシュのみ削除する。クライアントキャッシュ + IntersectionObserver 無限スクロール + 300ms デバウンス検索）、`MemberList.styles.ts`（テーブル用スタイル定数: `tableRoot`, `tableHeader`, `tableHeaderCell`, `tableHeaderCellCheckbox`, `tableRow`, `tableRowLast`, `tableCellId`, `tableCellName`, `tableCellCheckbox`, `skeletonRow`, `skeletonCell`, `skeletonLine`, `errorText`, `emptyText` 等）、`AddMemberSheet.styles.ts`（テーブル用スタイル定数: `searchSection`, `searchField`, `searchFieldIcon`, `tableRoot`, `tableHeader`, `tableHeaderCell`, `tableHeaderCellCheckbox`, `tableRow`, `tableRowLast`, `tableCellCheckbox`, `tableCellName`, `errorText`, `emptyText`, `skeletonRow`, `skeletonCell`, `skeletonLine` 等）、`GroupDetailPage.styles.ts`、テスト）。`MemberList` はネイティブ `<table>` で □選択 / id / 姓名 の 3 列を表示し、アバターアイコンは使用しない。`AddMemberSheet` のユーザーリストはネイティブ `<table>` で □選択 / 姓名 の 2 列を表示し、アバターアイコンは使用しない。`GroupDetailView` がフルページとシート表示の共通描画ロジックを担い、`GroupDetailSheet`・`GroupDetailPage` はそれぞれの表示コンテキスト固有のラッパー。`GroupDetailContent` が Edit ボタン・Delete ボタン・`EditGroupDialog`・`DeleteGroupDialog`・「メンバー追加」ボタンを統合し、編集成功時に `useGroupDetail.refetch` でキャッシュをクリアして再取得、削除成功時は `navigate("/")` でトップページへ遷移する。「メンバー追加」ボタンは `useSheetStack.openSheet` で `AddMemberSheet` をシートとして開く。`AddMemberSheet` はマウント時に `clearNonMemberListCache(groupId)` を呼び出して当該グループの非メンバーキャッシュをクリアし、常に最新の非メンバー一覧を取得する。追加成功時は `clearMemberListCache()` → `refetch()`（グループ詳細再取得）→ `onClose()`（`closeSheet()` + `refetch()` 再呼び出し）の順に呼び出し、409 競合エラーは「選択したユーザーはすでにメンバーです」と表示する。`MemberList` は `onRefetch` prop（省略可能）を受け取り、渡された場合のみ複数選択削除 UI（チェックボックス + 「削除」ボタン + 確認 `AlertDialog`）を表示する。削除成功時は `clearMemberListCache()` → `onRefetch()` の順に呼び出してメンバー一覧を更新する |

### `entities/`

FSD の entities レイヤー。現時点では使用していない（ディレクトリ自体が存在しない）。

グループ詳細画面で使用する `UserSummary` 型は `pages/group-detail/model/group-detail.ts`
に定義されており、ページ固有の型として `pages/` に留まる。複数画面で再利用が確定した際に `entities/`
への抽出を検討する（FSD の「使われてから抽出する」原則に従う）。

### `widgets/`

FSD の widgets レイヤー。ページ横断で使われる独立した UI ブロックを配置する。

- `header/` — アプリヘッダー（ハンバーガーメニューボタン付き、`z-index: 150`
  で Sheet オーバーレイより上に固定）。`ui/Header.tsx`、`ui/Header.styles.ts`、テスト
- `sidebar/`
  — サイドバーナビゲーション（オーバーレイ付きドロワー）。`ui/Sidebar.tsx`、`ui/Sidebar.styles.ts`、テスト。Props:
  `isOpen`・`onClose`（必須）、`onNavigate`（任意）。"Groups" ボタンをクリックすると `onClose()` と
  `onNavigate?.("/")` の両方を呼び出し、"Users" ボタンをクリックすると `onClose()` と
  `onNavigate?.("/users")` を呼び出す。`App.tsx` では `onNavigate={(path) => router.navigate(path)}`
  を渡して画面遷移させる

各 widget は `index.ts`（barrel export）を Public API として公開する。

### `shared/`

- `auth/auth.tsx` — 認証コンテキスト。`AuthProvider`（`AuthContext.Provider`）と `useAuth`
  フックを提供。`AuthUser` 型（`id`, `uuid`, `firstName`, `lastName`）を保持。`index.ts`
  から re-export
- `api/client.ts` — 汎用 fetch ラッパー（`apiFetch<T>`）と `HttpError`
  クラス。レスポンスエラー検知・JSON 変換を担う。204 No
  Content またはレスポンスボディが空（`content-length: 0`）の場合は `res.json()` を呼ばず
  `undefined` を返す。ボディなし DELETE など `apiFetch<void>` として使用する。`HttpError` は
  `status` プロパティを持ち `apiFetch<T>` がスローする
- `config/env.ts` — 環境変数の集約・エクスポート（`API_BASE_URL`
  は空文字列。サーバーサイドプロキシ経由のため同一オリジン）
- `lib/sheet-stack/`
  — シートスタック管理。`SheetStackProvider`（コンテキスト提供 + シートレンダリング）、`SheetStackContext`（型定義 +
  `useSheetStack` フック）、`index.ts`（barrel export）で構成
- `ui/index.ts` — 共通 UI コンポーネントの barrel
  export（`PageContainer`、`Sheet`、`sheetConstants`、`appColors`）
- `ui/PageContainer.tsx` — 全ページ共通のコンテンツラッパー（パディング制御）
- `ui/Sheet.tsx` — 右からスライドインするモーダルパネル。`createPortal`
  で描画、スクロールロック・ESC キー・オーバーレイクリックによるクローズ、トランジション完了後の DOM 除去を内包する。`headerActions?: ReactNode`
  prop で閉じるボタン（`FaChevronRight` アイコン）左隣にカスタムアクションを描画できる
- `ui/Sheet.styles.ts` —
  Sheet のスタイル定数とスタイルオブジェクト（アニメーション設定・z-index ベース値・サイズ定数を
  `sheetConstants` として export）
- `ui/theme.ts` — アプリ共通のカラーパレット（`appColors`）
- `api/__tests__/` / `auth/` / `config/__tests__/` — shared のテスト

### `test/`

- `setup.ts` — Vitest のグローバルセットアップ。`@testing-library/jest-dom` のインポートと
  `MockIntersectionObserver` クラスのグローバル登録（`global.IntersectionObserver`
  への代入）を行う。 `MockIntersectionObserver` は `export { MockIntersectionObserver }`
  でテストから参照可能

## インポート規則

1. **レイヤー間**: 上位レイヤーのみ下位をインポート可能（`app` → `widgets` → `pages` → `entities` →
   `shared`）

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

### クライアントキャッシュ + IntersectionObserver 無限スクロール

一覧系画面（グループ一覧・ユーザー一覧・メンバー一覧・非メンバー一覧）は共通のデータフローパターンに従う:

1. **単位取得**: API から `FETCH_LIMIT`（100 件）単位でデータを取得し、ローカルにキャッシュ
2. **全件表示**: キャッシュ済みデータをすべて表示する（クライアント側のページ分割なし）
3. **IntersectionObserver による自動追加取得**: センチネル要素（`<div ref={sentinelRef} />`）が viewport に入ったとき、`lastBatchSize === FETCH_LIMIT`（前回取得が上限件数）であれば次の 100 件を追加取得する。`lastBatchSize`
   が `FETCH_LIMIT` 未満であればデータ末尾と判断し追加取得しない
4. **ローカル Ref による stale closure 回避**: IntersectionObserver コールバック内では
   `isFetchingMoreRef`・`isLoadingRef`・`lastBatchSizeRef`・`fetchedOffsetRef`・`debouncedQueryRef`
   の Ref で最新値を参照する。それぞれ対応する state が変わるたびに Ref を同期する
5. **検索**: 入力値を 300ms デバウンス（`debouncedQuery`）してからキャッシュをクリアし、offset
   0から再取得。検索中の `effectiveTotal`
   はキャッシュ済み件数（`cachedItems.length`）を使い、非検索時は API レスポンスの `total` を使う
6. **件数ラベル**: ローディング中は "Loading..." 系メッセージ、`effectiveTotal > 0`
   で件数表示、`effectiveTotal === 0` で "No ... found" を表示する（`useGroupList` の
   `groupCountLabel` パターン）

このパターンは `useGroupList`・`useUserList`・`useMemberList`・`useNonMemberList`
の各カスタムフックで実装されている。新しい一覧画面を追加する場合は同パターンに従うこと。

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
| 認証コンテキスト・フック             | `src/shared/auth/`                                       |
| ルート固有のレイアウトコンポーネント | `src/app/routes/`                                        |
| アプリ全体の初期化・ルーティング     | `src/app/`                                               |
