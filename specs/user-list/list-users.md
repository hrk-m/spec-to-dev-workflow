# list-users — ユーザー一覧取得

## 概要

ユーザーの一覧を検索キーワードとオフセット条件を指定して取得する。画面表示時に自動で実行され、検索のたびに再取得が走る。クライアントは 100 件単位（FETCH_LIMIT=100）でフェッチしてキャッシュし、リスト末尾のセンチネル要素が viewport に入ると追加フェッチを自動実行する無限スクロール方式を採用する。

---

## 処理フロー（正常系）

```
画面が表示される
  │
  ├─ useUserList が limit=100, offset=0 で API リクエストを発行する
  ├─ 初回読み込み時はスケルトンローディングを表示する
  ├─ バックエンドからユーザー一覧（id, first_name, last_name）と total が返る
  ├─ cachedUsers にキャッシュされ、リストにユーザー（姓・名）が表示される
  └─ リスト末尾にセンチネル要素（sentinelRef）が配置される

検索キーワードを入力する
  │
  ├─ 300ms デバウンス後に cachedUsers をクリアして再フェッチ（q パラメータ付き）
  ├─ effectiveTotal = cachedUsers.length（検索中はキャッシュ件数を使用）
  └─ フィルター結果が表示される

センチネル要素が viewport に入る（スクロールで末尾に到達する）
  │
  ├─ IntersectionObserver が検知し、lastBatchSize === FETCH_LIMIT であれば doFetchMore を呼ぶ
  ├─ isFetchingMore が true になりローディングインジケーターを表示する
  ├─ 追加フェッチした結果を cachedUsers に追記する
  └─ lastBatchSize < FETCH_LIMIT であれば末尾到達と判定し、それ以上フェッチしない
```

---

## 処理フロー（異常系）

```
バックエンドへの通信が失敗する（ネットワークエラー・500 など）
  │
  └─ エラーメッセージが画面に表示される。一覧は空のまま

追加フェッチ（センチネルトリガー）が失敗する
  │
  └─ fetchMoreError にエラーメッセージが設定される。既存キャッシュ一覧はそのまま表示される

検索結果が 0 件の場合
  │
  ├─ isEmptyResult = true になる
  └─ ヘッダーサブタイトルに「No users found」が表示される
```

---

## 使用コンポーネント・状態

| 要素 | 種別 | 役割 |
|---|---|---|
| `UsersPage` | コンポーネント | ユーザー一覧ページのルートコンポーネント |
| `UserList` | コンポーネント | 検索・無限スクロール（センチネル要素）・スケルトン・空状態表示付きユーザー一覧コンポーネント |
| `useUserList` | カスタム Hook | fetch・検索・無限スクロール・キャッシュの状態と処理を管理する |
| `fetchUsers` | API 関数 | `GET /api/v1/users?q=&limit=&offset=` を呼び出す |
| `cachedUsers` | state | サーバーから取得したユーザーをキャッシュする（100 件単位でフェッチ） |
| `total` | state | ユーザーの総件数を保持する（q フィルターなしの全件数） |
| `searchQuery` | state | 検索キーワードを保持する |
| `debouncedQuery` | state | 300ms デバウンス済みの検索キーワード（API リクエストに使用） |
| `isFetchingMore` | state | センチネルトリガーによる追加フェッチ中かどうか |
| `fetchMoreError` | state | 追加フェッチのエラーメッセージ（null なら正常） |
| `lastBatchSize` | state | 直前のフェッチで取得した件数（FETCH_LIMIT 未満なら末尾到達と判定） |
| `fetchedOffset` | state | サーバーから取得済みのオフセット位置を保持する |
| `sentinelRef` | ref | リスト末尾のセンチネル要素への参照。IntersectionObserver に渡す |
| `isEmptyResult` | derived | ローディング終了後に表示件数が 0 の場合 true になる |
| `effectiveTotal` | derived | 検索中は cachedUsers.length、非検索時は API の total を使用する |

---

## 確認観点

```
- [ ] 画面を開くとスケルトン表示後にユーザー一覧が表示される
- [ ] ユーザーの姓・名が正しく表示される
- [ ] 初回マウント時に GET /api/v1/users?limit=100&offset=0 が呼び出される
- [ ] ヘッダーサブタイトルにユーザー総件数（total）が表示される
- [ ] 検索ボックスにキーワードを入力すると 300ms 後に一覧が絞り込まれる
- [ ] 検索をクリアすると全件が再表示される
- [ ] スクロールしてリスト末尾に到達すると次バッチが自動でロードされる（無限スクロール）
- [ ] 全件取得済みのとき末尾到達しても追加フェッチが走らない
- [ ] バックエンドへの通信が失敗するとエラーメッセージが表示される
- [ ] 検索結果が 0 件のとき「No users found」がヘッダーサブタイトルに表示される
- [ ] ページネーション（Previous / Next ボタン）が表示されない
```

---

## 使用 API

| エンドポイント | メソッド | 用途 |
|---|---|---|
| `/api/v1/users?limit=N&offset=N&q=keyword` | GET | ユーザー一覧（id, first_name, last_name）と total を取得する |

---

## 対応する API 仕様

→ `plans/user/list-users/prd.md`
