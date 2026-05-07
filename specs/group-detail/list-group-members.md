# list-group-members — メンバー一覧取得

## 概要

グループに所属するメンバーの一覧を検索キーワードで絞り込みながら取得する。グループ詳細画面のメンバーセクション（フィルターチップ行直下）に表示される。クライアントは 100 件単位（FETCH_LIMIT=100）でフェッチしてキャッシュし、リスト末尾のセンチネル要素が viewport に入ると追加フェッチを自動実行する無限スクロール方式を採用する。

フィルターチップ行で OFF にしたサブグループ ID は `excludeGroupIds` としてリクエストに乗り、BE が `exclude_group_ids` クエリパラメータで除外したメンバーのみを返す。BE は重複除外済み総件数を `total`、複数サブグループに重複所属する実ユーザー数を `duplicate_count` で返し、メンバーセクションヘッダーに「N件 / 重複 N件」として表示する。

---

## 処理フロー（正常系）

```
グループ詳細が表示される / メンバー検索キーワードを入力する
  │
  ├─ useMemberList が groupId・limit=100・offset=0・q・exclude_group_ids を元に API リクエストを発行する
  ├─ 初回読み込み時はスケルトンローディングを表示する
  ├─ バックエンドからメンバー一覧・総件数（total）・重複件数（duplicate_count）が返る
  ├─ apiTotal / duplicateCount が更新され、メンバーセクションヘッダーに反映される
  ├─ メンバーが □選択 / uuid / 姓名 / 所属元 の 4 列テーブル形式で表示される
  │    ├─ 「所属元」列: 親直属メンバーは「自グループ」、子孫由来メンバーは所属サブグループ名（複数の場合カンマ区切り）を表示する
  │    └─ □選択（チェックボックス）は親直属メンバー行のみ表示する。子孫由来行はセルが空になる
  └─ リスト末尾にセンチネル要素（sentinelRef）が配置される

センチネル要素が viewport に入る（スクロールで末尾に到達する）
  │
  ├─ IntersectionObserver が検知し、lastBatchSize === FETCH_LIMIT であれば doFetchMore を呼ぶ
  ├─ isFetchingMore が true になりローディングインジケーターを表示する
  ├─ 追加フェッチした結果を cachedMembers に追記する
  └─ lastBatchSize < FETCH_LIMIT であれば末尾到達と判定し、それ以上フェッチしない
```

---

## 処理フロー（異常系）

```
バックエンドへの通信が失敗する（ネットワークエラー・500 など）
  │
  └─ エラーメッセージがメンバーセクションに表示される

追加フェッチ（センチネルトリガー）が失敗する
  │
  └─ fetchMoreError にエラーメッセージが設定される。既存キャッシュ一覧はそのまま表示される

メンバーが 0 件の場合（検索0件・メンバー未所属グループを含む）
  │
  ├─ effectiveTotal（cachedMembers.length）が 0 になる
  └─ 「No members found.」メッセージが表示される
```

---

## 使用コンポーネント・状態

| 要素                   | 種別           | 役割                                                                                                                                                                                                                                     |
| ---------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MemberList`           | コンポーネント | メンバー検索・一覧・無限スクロール（センチネル要素）を表示する                                                                                                                                                                           |
| `MemberRow`            | コンポーネント | 個々のメンバー行（□選択 / uuid / 姓名 / 所属元 の 4 列）を表示する。チェックボックスと onMemberClick は親直属行（`isDirect=true`）のみ有効。`data-testid="member-row"` が付与されており E2E テストのセレクターとして使用される           |
| `useMemberList`        | カスタム Hook  | fetch・検索・無限スクロール・キャッシュの状態と処理を管理する。`excludeGroupIds?: number[]` を引数に受け取り、ソート済み・コンマ区切りの `exclude_group_ids` を `fetchGroupMembers` に渡す。フィルター違いごとにキャッシュキーを分離する |
| `useInfiniteList`      | 共通 Hook      | グループ一覧・メンバー一覧・ユーザー一覧で共有する無限スクロール基盤。`cacheKey`・`cache`・`fetchFn`・`buildParams` を渡して使う                                                                                                         |
| `excludeGroupIds`      | derived/state  | フィルターチップ行で OFF になっているサブグループ ID + 必要に応じて親グループ ID を含む配列。`GroupDetailContent` で 300ms デバウンス後に `debouncedExcludeGroupIds` として確定し `useMemberList` に渡す                                 |
| `apiTotal`             | state          | サーバーが返す重複除外済み総件数。フィルター変化中は `null` にリセットされ、`apiTotal ?? memberCount` のフォールバックでメンバーセクションヘッダーに表示する                                                                             |
| `duplicateCount`       | state          | サーバーが返す重複件数（`duplicate_count`）。複数サブグループに所属する実ユーザー数を表す。0 のときバッジを描画しない                                                                                                                    |
| `isDirectMember`       | ユーティリティ | `member.source_groups.some(sg => sg.group_id === groupId)` で親直属か判定する                                                                                                                                                            |
| `buildSourceLabel`     | ユーティリティ | `source_groups` を `groupId` を先頭に並べ替え、「自グループ」または `group_name` に変換してカンマ区切りで結合する。複数所属元がある場合はすべてカンマ区切りで表示する                                                                    |
| `cachedMembers`        | state          | サーバーから取得したメンバーをキャッシュする（100 件単位でフェッチ）                                                                                                                                                                     |
| `total`                | state          | メンバーの総件数を保持する（検索時は cachedMembers.length）                                                                                                                                                                              |
| `searchQuery`          | state          | メンバー検索キーワードを保持する                                                                                                                                                                                                         |
| `debouncedQuery`       | state          | 300ms デバウンス済みの検索キーワード（API リクエストに使用）                                                                                                                                                                             |
| `isFetchingMore`       | state          | センチネルトリガーによる追加フェッチ中かどうか                                                                                                                                                                                           |
| `fetchMoreError`       | state          | 追加フェッチのエラーメッセージ（null なら正常）                                                                                                                                                                                          |
| `lastBatchSize`        | state          | 直前のフェッチで取得した件数（FETCH_LIMIT 未満なら末尾到達と判定）                                                                                                                                                                       |
| `fetchedOffset`        | state          | サーバーから取得済みのオフセット位置を保持する                                                                                                                                                                                           |
| `sentinelRef`          | ref            | リスト末尾のセンチネル要素への参照。IntersectionObserver に渡す                                                                                                                                                                          |
| `effectiveTotal`       | derived        | 検索中は cachedMembers.length、非検索時は API の total を使用する                                                                                                                                                                        |
| `directMembers`        | derived        | `cachedMembers` から `isDirectMember` が true のメンバーのみ抽出したリスト。全選択チェックボックスの判定に使用する                                                                                                                       |
| `directMemberCount`    | derived        | `directMembers.length`。全選択チェックボックスの disabled 判定に使用する                                                                                                                                                                 |
| `clearMemberListCache` | 関数           | メンバー一覧のクライアントキャッシュをクリアし、`useMemberList` に再フェッチをトリガーする。メンバー追加・削除成功後に呼び出される                                                                                                       |

---

## 確認観点

```
- [ ] グループ詳細画面を開くとメンバー一覧がスケルトン表示後に表示される
- [ ] メンバーの uuid と姓名（姓 名）が正しく表示される
- [ ] メンバー行に uuid 値（ハイフン区切り形式）が表示される
- [ ] メンバー一覧に「所属元」列ヘッダーが表示される
- [ ] 親直属メンバーの所属元セルに「自グループ」が表示される（`source_groups` に親 id が含まれる場合）
- [ ] サブグループ由来メンバーの所属元セルにサブグループ名が表示される（`buildSourceLabel` で生成）
- [ ] 複数のサブグループ経由で所属するメンバーの所属元セルはカンマ区切りで全所属元が表示される
- [ ] 親直属メンバー行のみチェックボックスが表示される（子孫由来行はチェックボックスなし）
- [ ] 子孫由来メンバー行をクリックしてもメンバー詳細が開かない
- [ ] メンバー検索ボックスにキーワードを入力すると名前で絞り込まれる
- [ ] スクロールしてリスト末尾に到達すると次バッチが自動でロードされる（無限スクロール）
- [ ] 全件取得済みのとき末尾到達しても追加フェッチが走らない
- [ ] 全選択チェックボックスの判定は親直属メンバー数（`directMemberCount`）基準である（子孫由来は計算対象外）
- [ ] メンバーが 0 件のとき「No members found.」が表示される
- [ ] 検索結果が 0 件のとき `data-testid="member-row"` 要素が DOM に存在しない
- [ ] バックエンドへの通信が失敗するとエラーメッセージが表示される
- [ ] 追加フェッチ（センチネルトリガー）が失敗したときリスト末尾にエラーメッセージが表示され、既存アイテムは維持される
- [ ] `clearMemberListCache` が呼ばれると再フェッチが実行され、メンバー一覧が最新化される
- [ ] フィルターチップを OFF にすると 300ms デバウンス後に `exclude_group_ids` 付きで再フェッチされる
- [ ] フィルター変化中は `apiTotal` が `null` にリセットされ、フォールバック件数が一時表示される
- [ ] サーバーが `duplicate_count > 0` を返したときヘッダーに「重複 N件」バッジが表示される
- [ ] サーバーが `duplicate_count = 0` を返したとき重複バッジは描画されない
- [ ] ページネーション（Previous / Next ボタン）が表示されない
```

---

## 使用 API

| エンドポイント                                                                    | メソッド | 用途                                                                                                             |
| --------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `/api/v1/groups/:id/members?limit=N&offset=N&q=keyword&exclude_group_ids=ID1,ID2` | GET      | メンバー一覧を取得する。`exclude_group_ids` で OFF にされたサブグループ ID（必要に応じて親 ID も含む）を除外する |

---

## 対応する API 仕様

→ `plans/group/list-group-members/prd.md`
