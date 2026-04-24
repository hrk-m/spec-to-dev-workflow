# sheet-navigation — シートナビゲーション

## 概要

グループ一覧でグループをクリックすると、画面遷移せずに右からシートがスライドインしてグループ詳細を表示できる。シートが開いた状態のまま背後に一覧が見え、コンテキストを失わずに詳細を確認できる。さらにメンバー行をクリックすると MemberDetailSheet がシートの上に重なって表示される。シートヘッダーの ↔ ボタンをクリックするとフルページ（`/groups/:id`）へ展開できる。

---

## 処理フロー（正常系）

### グループ詳細シートを開く

```
ユーザーがグループ行をクリックする
  │
  ├─ GroupNavigationLayout が URL を /groups/:id（state: presentation="sheet"）に変更する
  ├─ GroupDetailRouteSheet が Sheet コンポーネントでスライドインアニメーションを開始する
  └─ GroupDetailSheet が表示される（グループ名・説明・メンバー一覧を GroupDetailView と同じ構成で表示）
```

### MemberDetailSheet を開く

```
ユーザーがシート内のメンバー行をクリックする
  │
  ├─ GroupNavigationLayout が SheetStack に MemberDetailSheet を積む
  ├─ GroupDetailRouteSheet の幅が 90vw → 100vw に広がる（アニメーション同時）
  └─ MemberDetailSheet が GroupDetailRouteSheet の上にスタックされてスライドインする
```

### シートを閉じる

```
ユーザーが > ボタン（FaChevronRight）/ ESC キー / シート外エリアをクリックする
  │
  ├─ closing ステートが true になる → translateX(100%) でスライドアウト開始（500ms）
  └─ transitionend 後に DOM から削除される。URL が前の状態に戻る（navigate(-1)）
```

### フルページへ展開する

```
ユーザーがシートヘッダーの ↔ ボタン（TbArrowsHorizontal）をクリックする
  │
  ├─ navigate('/groups/:id', { replace: true }) を呼び出す
  ├─ シートが消えて GroupDetailPage がフルページで表示される
  └─ ブラウザの戻るボタンで /groups 一覧に戻る（replace のため履歴はシート前の状態）
```

---

## 処理フロー（異常系）

```
グループ API が 404 / 500 を返す
  │
  └─ シートは開いたまま。コンテンツエリアにエラーメッセージが表示される
```

---

## 使用コンポーネント・状態

| 要素                                   | 種別                                     | 役割                                                                                                                                                                                                                                                                        |
| -------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GroupNavigationLayout`                | コンポーネント（app/routes）             | URL と state を見てシートかフルページかを振り分ける                                                                                                                                                                                                                         |
| `Sheet`                                | コンポーネント（shared/ui）              | スライドインシートの汎用コンポーネント。ESC・overlay クローズを内蔵。overlay の `onWheel` + container の `overscrollBehavior: contain` でスクロール制御（body.style.overflow は変更しない）。`headerActions?: ReactNode` で閉じるボタン左隣にカスタムアクションを描画できる |
| `GroupDetailRouteSheet`                | コンポーネント（app/routes）             | Sheet の closing state と幅制御を担う。groupId が変わると closing をリセット。`headerActions` として ↔ ボタン（`TbArrowsHorizontal`）を渡し、クリックで `navigate('/groups/:id', { replace: true })` を呼び出す                                                             |
| `GroupDetailSheet`                     | コンポーネント（pages/group-detail）     | GroupDetailView のシートコンテンツ版。groupId と onMemberClick を props で受取                                                                                                                                                                                              |
| `MemberDetailSheet`                    | コンポーネント（pages/group-detail）     | メンバー名とプレースホルダーメッセージを表示する                                                                                                                                                                                                                            |
| `SheetStackProvider` / `useSheetStack` | Context / Hook（shared/lib/sheet-stack） | MemberDetailSheet のスタック管理。sheets 配列を共有する                                                                                                                                                                                                                     |
| `closing`                              | state                                    | Sheet のスライドアウトアニメーションをトリガーするフラグ                                                                                                                                                                                                                    |

---

## 確認観点

```
- [ ] グループ行クリックでシートが右からスライドインして表示される
- [ ] シート内にグループ名・説明・メンバー一覧が表示される
- [ ] > ボタン（FaChevronRight）クリックでシートが閉じる
- [ ] ESC キーでシートが閉じる
- [ ] シート外エリア（オーバーレイ）クリックでシートが閉じる
- [ ] シートが開いている間 body のスクロールバーが維持される（body.style.overflow は変更されない）
- [ ] メンバー行クリックで MemberDetailSheet が積まれる（2 枚のシートが重なる）
- [ ] MemberDetailSheet の × で MemberDetailSheet だけ閉じ、GroupDetailSheet が残る
- [ ] MemberDetailSheet にメンバー名（姓・名）が表示される
- [ ] /groups/:id に直接アクセスするとシートでなくフルページの GroupDetailPage が表示される
- [ ] API エラー時にシートが開いたままエラーメッセージが表示される
- [ ] GroupDetailSheet 内でメンバー検索キーワードを入力するとメンバーが絞り込まれる
- [ ] GroupDetailSheet 内でメンバー検索 0 件時に「No members found.」が表示され、ページネーションが非表示になる
- [ ] GroupDetailSheet 内で検索キーワードをクリアすると全メンバーが再表示される
- [ ] シートを閉じた後にグループ一覧の検索が引き続き機能する
- [ ] GroupDetailSheet ヘッダーに ↔ ボタン（TbArrowsHorizontal）が表示される
- [ ] ↔ ボタンクリックでシートが消えてフルページ（/groups/:id）に遷移する
- [ ] ↔ クリック後のフルページで同じグループ名・説明が表示される
- [ ] ↔ クリック後のブラウザ戻るボタンで /groups 一覧に戻る
```

---

## 使用 API

シートナビゲーション自体は API を直接呼び出さない。シートコンテンツとして描画される `GroupDetailSheet` / `GroupDetailContent` がそれぞれの機能で API を呼び出す（詳細は [get-group.md](./get-group.md) / [list-group-members.md](./list-group-members.md) を参照）。

---

## 対応する API 仕様

→ `plans/group/sheet-navigation/prd.md`
