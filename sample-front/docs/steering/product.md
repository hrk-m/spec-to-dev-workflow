---
inclusion: always
---

# Product

## 目的

`sample-front`
は spec-to-dev-workflow プロジェクトにおけるフロントエンドのサンプル実装です。バックエンド API（`sample-api`）と連携し、仕様駆動開発のワークフローを実証します。

## コア機能

- グループ一覧表示（検索・無限スクロール付き、`/api/v1/groups`
  エンドポイント）。クライアントキャッシュ戦略（100 件単位取得 → クライアント側でキャッシュ）と IntersectionObserver による自動追加取得を備える。検索入力は 300ms デバウンスし、検索中は "No
  groups found" の空状態表示に対応
- グループ作成（ダイアログ形式、`POST /api/v1/groups`
  エンドポイント）。名前バリデーション（必須・100 文字以内）付き。作成成功時はグループ詳細画面へ自動遷移
- グループ詳細表示（グループ情報 + メンバー一覧、`/api/v1/groups/:id` + `/api/v1/groups/:id/members`
  エンドポイント）。メンバー一覧も同様のクライアントキャッシュ・IntersectionObserver 無限スクロール・検索（300ms デバウンス）を備える
- グループ編集（ダイアログ形式、`PUT /api/v1/groups/:id`
  エンドポイント）。名前バリデーション（必須・100 文字以内）付き。編集成功時はグループ詳細を再取得して表示を更新
- グループ削除（確認ダイアログ形式、`DELETE /api/v1/groups/:id` エンドポイント）。Radix UI
  `AlertDialog` による削除確認 UI。削除成功時はトップページ（`/`）へ自動遷移
- メンバー追加（Sheet 形式、`POST /api/v1/groups/:id/members`
  エンドポイント）。グループ詳細画面の「メンバー追加」ボタンから `AddMemberSheet`
  をシートで開き、`GET /api/v1/groups/:id/non-members`
  で取得した未所属ユーザーをチェックボックスで複数選択して一括追加する。`AddMemberSheet`
  はマウント時に `clearNonMemberListCache(groupId)`
  を呼び出して当該グループの非メンバーキャッシュをクリアし、常に最新の非メンバー一覧を取得する。検索（300ms デバウンス）・IntersectionObserver 無限スクロールを備え、追加成功時は
  `clearMemberListCache()` → `refetch()`（グループ詳細再取得）→ `onClose()`（`closeSheet()` +
  `refetch()`
  を再呼び出し）の順に呼び出してメンバー一覧とグループ詳細を更新する。409 競合エラーは「選択したユーザーはすでにメンバーです」と表示する
- メンバー削除（`DELETE /api/v1/groups/:id/members`
  エンドポイント）。メンバー一覧のチェックボックスで複数選択し、「削除」ボタン（`onRefetch`
  prop が渡された場合のみ表示）から Radix UI `AlertDialog`
  による確認ダイアログを経て一括削除する。削除成功時は `clearMemberListCache()` → `onRefetch()`
  の順に呼び出してメンバー一覧を更新する。エラー時は確認ダイアログ内にエラーメッセージを表示する
- ユーザー一覧表示（検索・無限スクロール付き、`GET /api/v1/users`
  エンドポイント）。クライアントキャッシュ戦略（100 件単位取得 → クライアント側でキャッシュ）と IntersectionObserver による自動追加取得を備える。検索入力は 300ms デバウンスし、ユーザー名の部分一致検索に対応する
- App Shell パターン（Header + Sidebar によるナビゲーション）。サイドバー開閉時は
  `react-remove-scroll-bar`
  でスクロールバーを非表示にし、ヘッダーの padding-right で幅のズレを補正。Sidebar の "Groups" ボタンは
  `/`、"Users" ボタンは `/users` へ遷移する（`onNavigate(path)` prop 経由）
- 認証ガード（`ProtectedRoute`）: `GET /api/v1/me` を呼び出してセッション確認。401 は
  `reason="unauthenticated"` で `/service-unavailable` へリダイレクト、その他のエラーは
  `reason="api_unavailable"` でリダイレクト。認証済みユーザー情報（`id`, `uuid`, `firstName`,
  `lastName`）は `shared/auth` の `AuthContext` に保存される
- サービス利用不可画面（`ServiceUnavailablePage`）: `/service-unavailable` ルート。マウント時に
  `GET /api/v1/me` を再試行し、成功すれば `/` へリダイレクト。失敗時はメンテナンス中メッセージを表示
- react-router v7 によるクライアントサイドルーティング（`/`, `/groups`, `/groups/:id`, `/users`,
  `/service-unavailable`）
- サーバーサイド API プロキシ（Bun サーバーが `/api/*` リクエストをバックエンドに中継）
- Feature-Sliced Design に沿ったスケーラブルなフロントエンド構造のデモ

## 価値

- スペックから実装へのワークフローを具体的に示す参照実装
- FSD v2.1 のアーキテクチャパターンを実際のコードで体験できる
