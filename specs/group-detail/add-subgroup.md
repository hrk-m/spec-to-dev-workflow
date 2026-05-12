# add-subgroup — サブグループ追加

## 概要

グループ詳細画面のフィルターチップ行右端にある「サブグループ管理」ボタンをクリックすると SubgroupManagementSheet が開き、その中の「＋ 追加」ボタンをクリックすると AddSubgroupSheet（シート）が新たにスタックで表示される。シート内でグループを検索・ラジオ選択し、「追加」ボタンで選択したグループをサブグループ（子グループ）として登録できる。すでに直接の子グループになっているグループは候補から除外される。

---

## 処理フロー（正常系）

```
ユーザーが「サブグループ管理」ボタンをクリックする（フィルターチップ行右端）
  │
  ├─ SubgroupManagementSheet が SheetStack に積まれ、右からスライドインして表示される
  │
ユーザーが SubgroupManagementSheet 内の「＋ 追加」ボタンをクリックする
  │
  ├─ AddSubgroupSheet が SheetStack にさらに積まれ、右からスライドインして表示される
  ├─ GET /api/v1/groups を送信する（全グループ一覧取得）
  ├─ 取得件数が "X groups" としてシート上部に表示される（total）
  ├─ グループ一覧がシート内にリスト表示される（自分自身と既存子グループを除外）
  ├─ ユーザーが検索キーワードを入力する（300ms デバウンス）
  │    ├─ GET /api/v1/groups?q={keyword} を送信する
  │    └─ 検索結果と "X groups" 件数表示を更新する
  ├─ ユーザーがグループ行またはラジオボタンをクリックしてグループを選択する
  │    └─ 選択済み行が青系の背景色でハイライトされる
  ├─ 「追加」ボタンをクリックする（未選択時は disabled）
  ├─ POST /api/v1/groups/:id/subgroups { "child_group_id": {selectedId} } を送信する
  ├─ API が 201 Created を返す
  ├─ onSuccess() コールバックで SubgroupManagementSheet 側の `refetch()` が呼ばれ、サブグループ一覧・フィルターチップ行・メンバー一覧が更新される
  └─ AddSubgroupSheet が閉じる（onClose() 経由）。SubgroupManagementSheet は開いたまま残る
```

---

## 処理フロー（異常系）

```
グループ一覧の取得失敗（4xx・5xx）
  │
  └─ シート内にエラーメッセージを表示する。シートは開いたまま

「追加」で 409 Conflict（すでにサブグループに設定済み）
  │
  └─ シート内に「すでに追加済みです」を表示する。シートは開いたまま

「追加」でその他エラー（400 循環参照・上限超過 / 4xx・5xx）
  │
  └─ シート内に「エラーが発生しました。しばらくしてから再試行してください。」を表示する。シートは開いたまま

未選択状態で「追加」クリック
  │
  └─ 「追加」ボタンは disabled のためクリック不可（送信されない）
```

---

## 使用コンポーネント・状態

| 要素                      | 種別           | 役割                                                                                                                                                                  |
| ------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GroupDetailContent`      | コンポーネント | フィルターチップ行と「サブグループ管理」ボタンを配置し、`openSheet()` で SubgroupManagementSheet を SheetStack に登録する                                             |
| `SubgroupFilterChips`     | コンポーネント | サブグループのフィルターチップを横スクロールで描画し、右端に「サブグループ管理」ボタンを表示する                                                                      |
| `SubgroupManagementSheet` | コンポーネント | サブグループ一覧（グループ名・説明・"N members" + 削除ボタン）と「＋ 追加」ボタンを表示する。「＋ 追加」クリックで AddSubgroupSheet を `useSheetStack` でスタックする |
| `AddSubgroupSheet`        | コンポーネント | 検索入力・ラジオ選択付きグループ一覧・「追加」ボタンを提供するシートコンテンツ                                                                                        |
| `fetchGroups`             | API 関数       | `GET /api/v1/groups` を呼び出して全グループ一覧と total を取得する                                                                                                    |
| `useSearchableGroupList`  | カスタム Hook  | `fetchGroups` をラップし、`searchQuery` の変化を 300ms デバウンス後に API へ送信する。`groups`・`total`・`isLoading`・`error` を返す                                  |
| `useAddSubgroup`          | カスタム Hook  | サブグループ追加の送信ロジックを管理する。`isLoading`・`error`・`submit` を返す。409 時は「すでに追加済みです」、その他エラーは汎用メッセージを設定する               |
| `addSubgroup`             | API 関数       | `POST /api/v1/groups/:id/subgroups` を呼び出す                                                                                                                        |
| `selectedGroupId`         | state          | ラジオ選択されたグループの ID（`number \| null`）                                                                                                                     |
| `searchQuery`             | state          | 検索フィールドの入力値。300ms デバウンス後に API リクエストを送信する                                                                                                 |
| `groups`                  | state          | GET で取得したグループ一覧                                                                                                                                            |
| `total`                   | state          | GET /api/v1/groups のレスポンス件数。"X groups" としてシート上部に表示する（`number \| null`）                                                                        |
| `availableGroups`         | 派生値         | `groups` から自分自身（`groupId`）と既存子グループ（`existingChildIds`）を除外したリスト                                                                              |
| `fetchError`              | state          | GET /api/v1/groups のエラーメッセージ                                                                                                                                 |
| `submitError`             | state          | POST /api/v1/groups/:id/subgroups のエラーメッセージ（409 時は「すでに追加済みです」）                                                                                |
| `isSubmitting`            | state          | API 呼び出し中かどうか。「追加」ボタンの disabled 制御に使用                                                                                                          |
| `isFetchingGroups`        | state          | グループ一覧取得中かどうか。`true` のときスケルトン表示（4 行）                                                                                                       |
| `isActiveRef`             | ref            | デバウンスタイマーのクリーンアップ用フラグ。アンマウント後の state 更新を防ぐ                                                                                         |

---

## 確認観点

```
- [ ] フィルターチップ行右端に「サブグループ管理」ボタンが表示される（サブグループ 0 件時も表示される）
- [ ] 「サブグループ管理」ボタンクリックで SubgroupManagementSheet が表示される
- [ ] SubgroupManagementSheet 内に「＋ 追加」ボタンが表示される
- [ ] 「＋ 追加」ボタンクリックで AddSubgroupSheet が SubgroupManagementSheet の上にスタックされて表示され、グループ一覧が描画される
- [ ] グループ一覧に自分自身のグループが表示されない（除外される）
- [ ] 既に直接の子グループになっているグループが候補から除外される
- [ ] グループ行をクリックするとラジオ選択されて行がハイライトされる
- [ ] 未選択状態では「追加」ボタンが disabled
- [ ] グループを選択すると「追加」ボタンが enabled になる
- [ ] 「追加」クリックで成功するとシートが閉じ、Subgroups 一覧が更新される
- [ ] 検索キーワード入力（300ms デバウンス）でグループ一覧が絞り込まれる
- [ ] 409 エラー時はシート内に「すでに追加済みです」が表示される（シートは開いたまま）
- [ ] 400 エラー（循環参照・上限超過等）時はシート内に「エラーが発生しました。しばらくしてから再試行してください。」が表示される（シートは開いたまま）
- [ ] GET /api/v1/groups 失敗時はシート内にエラーメッセージが表示される
- [ ] 候補グループがすべて除外されて 0 件のとき「追加できるグループがありません。」が表示される
- [ ] サブグループが 0 件のとき SubgroupManagementSheet 内に「サブグループはまだありません」が表示される
- [ ] サブグループが 1 件以上のとき SubgroupManagementSheet 内にグループ名・説明・メンバー数（"N members"）と「削除」ボタンが表示される
- [ ] ロード中はグループ一覧部分にスケルトン（4 行）が表示される
```

---

## 使用 API

| エンドポイント                 | メソッド | 用途                                                  |
| ------------------------------ | -------- | ----------------------------------------------------- |
| `/api/v1/groups`               | GET      | サブグループ候補となるグループ一覧と total を取得する |
| `/api/v1/groups/:id/subgroups` | POST     | 選択したグループをサブグループとして登録する          |

---

## 対応する API 仕様

→ `plans/group/add-subgroup/prd.md`
