---
inclusion: always
---

# Tech

## スタック

| カテゴリ                | 技術                                                            |
| ----------------------- | --------------------------------------------------------------- |
| ランタイム / バンドラー | Bun                                                             |
| UI ライブラリ           | React 19                                                        |
| ルーティング            | react-router v7                                                 |
| UI コンポーネント       | Radix UI Themes                                                 |
| アイコン                | react-icons                                                     |
| スクロール制御          | react-remove-scroll-bar（Sidebar 開閉時のスクロールバー非表示） |
| 認証                    | セッションベース認証（`GET /api/v1/me` による確認）             |
| 言語                    | TypeScript (strict)                                             |
| テスト                  | Vitest + Testing Library (jsdom)                                |
| リント                  | oxlint                                                          |
| フォーマット            | Prettier + `@ianvs/prettier-plugin-sort-imports`                |

## 主要な決定事項

### Bun ファースト

開発サーバー・ビルド・テスト実行をすべて Bun で統一。`bun --hot` による HMR、`bun build`
による本番バンドルを利用。

### ルーティング

react-router v7 を使用。`src/app/router.tsx` で `createBrowserRouter`
によりルート定義を一元管理し、`App.tsx` で `RouterProvider`
を通じてマウントする。ルート定義の最上位で `SheetStackProvider`
をラップし、Sheet スタックのコンテキストをアプリ全体に提供する。 `GroupNavigationLayout` が
`/`・`/groups`・`/groups/:id`・`/users` のルーティングを制御し、`/users` は
`UsersPage`、`/groups/:id` は `location.state.presentation === "sheet"`
の場合はシート表示、それ以外はフルページ遷移を行う。

### パスエイリアス

`@/` は `src/` を指す。すべての内部インポートは相対パスではなく `@/` を使う。

```ts
// Good
import { apiFetch } from "@/shared/api/client";
// Bad
import { apiFetch } from "../../shared/api/client";
```

### サーバーサイド API プロキシ

`src/index.ts` の Bun サーバーが `/api/*` パスへのリクエストをバックエンド（`API_UPSTREAM_URL`
環境変数、デフォルト
`http://localhost:8080`）へ中継する。ブラウザからは同一オリジンへのリクエストとなるため、
`API_BASE_URL` は空文字列。CORS を気にせずフロントエンドから API を呼び出せる。

### 環境変数

- `PORT`: Bun サーバーの待受ポート
- `API_UPSTREAM_URL`: `/api/*` のプロキシ先

ローカル起動では `sample-front/.env.local`、Docker 起動では `sample-front/.env.docker`
を使う。ホスト公開ポートはローカルが `3000`、Docker が `3001`。

### 認証パターン

`shared/auth` が `AuthContext` を提供し、`AuthProvider` でアプリ全体をラップする（`router.tsx` の
`Layout` コンポーネント内）。

- `useAuth()` — `{ user, setUser }` を返す。`AuthProvider` 外で呼び出すとエラーをスロー
- `ProtectedRoute` — マウント時に `GET /api/v1/me` を呼び出してセッション確認。成功時は `setUser`
  でユーザー情報をコンテキストに保存して子をレンダリング。401 は `reason="unauthenticated"` で
  `/service-unavailable` へリダイレクト、その他エラーは `reason="api_unavailable"` でリダイレクト
- `HttpError` — `apiFetch` がレスポンスの `ok` が偽のときにスローする。`status`
  プロパティで HTTP ステータスコードを参照できる。`shared/api` の index.ts から re-export されている

### Sheet コンポーネントの動作規約

`shared/ui/Sheet` は右からスライドインするモーダルパネル。以下の動作を標準とする:

- **アニメーション**: 500ms `cubic-bezier(0.4, 0, 0.2, 1)` で `transform` と `width`
  を同時にトランジション。オーバーレイは `ease-out` でフェード
- **スクロール制御**: `Sheet` コンポーネント自身が `closing` でない間、`useEffect` 内で
  `document.body.style.overflowY = "hidden"`
  を適用して背面スクロールをブロックし、クリーンアップ時に元の値（`prev`）に戻す。コンテナには
  `overscrollBehavior: "contain"` を設定してシート内スクロールがページに伝播しないようにする
- **ESC キー**: `keydown` イベントで `Escape` キーを検知し `onClose` を呼び出す
- **オーバーレイクリック**: オーバーレイ領域のクリックで `onClose` を呼び出す
- **クローズアニメーション**: `closing` prop が `true` になると `translateX(100%)`
  へスライドアウトし、`transitionend` イベントで `onRemove` を呼んで DOM から除去
- **タイトル表示**: `title` prop（省略可能）を渡すと、ヘッダー左側に fontSize 40 / fontWeight
  700 のタイトルを表示。省略時はヘッダー左側は空のスペースとなり、閉じるボタンが右端に配置される
- **ヘッダーアクション**: `headerActions?: ReactNode`
  prop（省略可能）を渡すと、閉じるボタン（`FaChevronRight`
  アイコン）の左隣に描画される。`GroupDetailRouteSheet` では ↔ ボタン（`TbArrowsHorizontal`
  アイコン）を渡してフルページ展開を実現する

### z-index 階層

| 要素                      | z-index | 備考                                                     |
| ------------------------- | ------- | -------------------------------------------------------- |
| Radix Dialog オーバーレイ | 200     | `index.css` で `!important` 指定                         |
| Header                    | 150     | Sheet オーバーレイより上に表示するため                   |
| Sheet (base)              | 100     | `sheetConstants.baseZIndex`。スタック時は `+2` ずつ加算  |
| GroupDetail シート        | 98      | `baseZIndex - 2`。子シート（メンバー詳細等）より下に配置 |

### Sheet スタック

`shared/lib/sheet-stack` が複数シートの重ね合わせを管理する。`SheetStackProvider`
がコンテキストを提供し、`useSheetStack` フックで `openSheet` / `closeSheet` / `removeSheet` /
`closeAll` を操作する。最前面以外のシートは `fullWidth`（100vw）に拡大され、最前面のシートのみ
`defaultWidth`（90vw）で表示される。

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
- インポート順: React → サードパーティ → `@/app` → `@/pages` → `@/entities` → `@/shared`
  → 親相対パス(`../`) → 同階層相対パス(`./`)
- 注意: `@/widgets`・`@/features` は `.prettierrc.mjs` の `importOrder`
  に明示指定されていないため、サードパーティと `@/app`
  の間にフォールバック配置される。新しい FSD レイヤー（`@/widgets` 等）を追加した際は `importOrder`
  への追記を忘れないこと

### テスト構成

- `vitest.config.ts` で React plugin と jsdom を設定済み
- `globals: true` により `describe`, `it`, `expect` 等をインポート不要で使用可能
- セットアップファイル: `src/test/setup.ts`（`@testing-library/jest-dom` のインポート +
  `MockIntersectionObserver` のグローバル登録）
- カバレッジ: `vitest run --coverage`（v8 プロバイダー、レポーター: `text` + `lcov`）

**MockIntersectionObserver パターン**:

jsdom は `IntersectionObserver` を実装しないため、`src/test/setup.ts` で `MockIntersectionObserver`
クラスをグローバルに設定している。テストから利用する際は以下のパターンを使う:

```ts
import { MockIntersectionObserver } from "@/test/setup";

beforeEach(() => MockIntersectionObserver.reset());

// sentinel 要素が viewport に入ったとき（`isIntersecting: true`）を模倣してフックを発火させる
MockIntersectionObserver.triggerAll([{ isIntersecting: true }]);
```

`MockIntersectionObserver.triggerAll`
はすべての登録済み observer に対してコールバックを発火する。個別の observer だけ発火させたい場合は
`MockIntersectionObserver.instances[n].triggerIntersect(entries)` を使う。

## コマンド

### bun scripts

```bash
bun dev             # .env.local を読み込んで開発サーバー起動 (HMR)
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
make run            # .env.local を使って開発サーバー起動
make check          # typecheck + lint + format + test をまとめて実行
```
