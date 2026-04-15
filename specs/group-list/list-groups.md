# list-groups — グループ一覧取得

## 概要

グループの一覧を検索キーワードとオフセット条件を指定して取得する。画面表示時に自動で実行され、検索のたびに再取得が走る。クライアントは 100 件単位（FETCH_LIMIT=100）でフェッチしてキャッシュし、リスト末尾のセンチネル要素が viewport に入ると追加フェッチを自動実行する無限スクロール方式を採用する。

---

## 処理フロー（正常系）

```
画面が表示される / 検索キーワードを入力する
  │
  ├─ useGroupList が limit=100, offset=0 で API リクエストを発行する
  ├─ 初回読み込み時はスケルトンローディングを表示する
  ├─ バックエンドからグループ一覧と total が返る
  ├─ cachedGroups にキャッシュされ、グループ（名称・説明・メンバー数）がリスト表示される
  ├─ リスト末尾にセンチネル要素（sentinelRef）が配置される
  └─ グループ行をクリックするとグループ詳細画面（/groups/:id）へ遷移する

センチネル要素が viewport に入る（スクロールで末尾に到達する）
  │
  ├─ IntersectionObserver が検知し、lastBatchSize === FETCH_LIMIT であれば doFetchMore を呼ぶ
  ├─ isFetchingMore が true になりローディングインジケーターを表示する
  ├─ 追加フェッチした結果を cachedGroups に追記する
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

検索ワード入力中に連続リクエストが発生する
  │
  └─ 最新のリクエスト結果のみ反映される（古いレスポンスは無視される）

検索結果が 0 件の場合
  │
  ├─ effectiveTotal（cachedGroups.length）が 0 になる
  ├─ ヘッダーサブタイトルに「No groups found」が表示される
  └─ 「No groups matched that search.」の空メッセージが表示される
```

---

## 使用コンポーネント・状態

| 要素 | 種別 | 役割 |
|---|---|---|
| `GroupList` | コンポーネント | グループ一覧リスト・無限スクロール（センチネル要素）を表示する |
| `useGroupList` | カスタム Hook | fetch・検索・無限スクロール・キャッシュの状態と処理を管理する |
| `cachedGroups` | state | サーバーから取得したグループをキャッシュする（100 件単位でフェッチ） |
| `total` | state | グループの総件数を保持する |
| `searchQuery` | state | 検索キーワードを保持する |
| `debouncedQuery` | state | 300ms デバウンス済みの検索キーワード（API リクエストに使用） |
| `isFetchingMore` | state | センチネルトリガーによる追加フェッチ中かどうか |
| `fetchMoreError` | state | 追加フェッチのエラーメッセージ（null なら正常） |
| `lastBatchSize` | state | 直前のフェッチで取得した件数（FETCH_LIMIT 未満なら末尾到達と判定） |
| `fetchedOffset` | state | サーバーから取得済みのオフセット位置を保持する |
| `sentinelRef` | ref | リスト末尾のセンチネル要素への参照。IntersectionObserver に渡す |
| `effectiveTotal` | derived | 検索中は cachedGroups.length、非検索時は API の total を使用する |
| `isWideLayout` | state | ウィンドウ幅が 1024px 以上かどうかのレイアウトフラグ |

---

## 確認観点

```
- [ ] 画面を開くとスケルトン表示後にグループ一覧が表示される
- [ ] グループの名称・説明・メンバー数が正しく表示される
- [ ] 検索ボックスにキーワードを入力すると一覧が絞り込まれる
- [ ] グループ行をクリックするとグループ詳細画面へ遷移する
- [ ] スクロールしてリスト末尾に到達すると次バッチが自動でロードされる（無限スクロール）
- [ ] 全件取得済みのとき末尾到達しても追加フェッチが走らない
- [ ] バックエンドへの通信が失敗するとエラーメッセージが表示される
- [ ] 検索キーワードの連続入力で不整合なデータが表示されない
- [ ] 検索結果が 0 件のとき「No groups found」がヘッダーサブタイトルに表示される
- [ ] 検索結果が 0 件のとき「No groups matched that search.」の空メッセージが表示される
- [ ] ページネーション（Previous / Next ボタン）が表示されない
```

---

## 使用 API

| エンドポイント | メソッド | 用途 |
|---|---|---|
| `/api/v1/groups?offset=N&limit=N&q=keyword` | GET | グループ一覧を取得する |

---

## 対応する API 仕様

→ `plans/group/list-groups/prd.md`
