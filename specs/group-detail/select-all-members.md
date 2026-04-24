# select-all-members — 全メンバー一括選択 / 全解除

## 概要

グループ詳細画面のメンバーリストで、テーブルヘッダー左端の全選択チェックボックスをクリックすることで、表示中の全メンバーを一括選択・全解除できる。一部のメンバーのみ選択されているときは indeterminate（半選択）状態を表示する。

---

## 処理フロー（正常系）

```
全未選択 または indeterminate 状態でヘッダーチェックボックスをクリックする
  │
  ├─ handleSelectAll が呼ばれる
  ├─ isAllSelected = false → 全メンバーの id を selectedIds にセットする
  └─ 「削除」ボタンが enabled になる

全選択状態でヘッダーチェックボックスをクリックする
  │
  ├─ handleSelectAll が呼ばれる
  ├─ isAllSelected = true → selectedIds を空の Set にリセットする
  └─ 「削除」ボタンが disabled に戻る

一部のみ選択されているとき（indeterminate 状態）
  │
  ├─ isSomeSelected = true → useEffect で headerCheckboxRef.current.indeterminate = true を設定する
  └─ DOM の `.indeterminate` プロパティが true になりブラウザがハーフチェック表示を行う
```

---

## 処理フロー（異常系）

```
メンバーが 0 件の場合
  │
  └─ ヘッダーチェックボックスが disabled になり、クリックできない（handleSelectAll は呼ばれない）
```

---

## ヘッダーチェックボックスの状態派生

| 条件                             | ヘッダーチェックボックスの状態 |
| -------------------------------- | ------------------------------ |
| メンバー 0 件                    | disabled                       |
| メンバー 1 件以上 かつ 全未選択  | 未チェック                     |
| 0 < 選択数 < 全体数              | indeterminate（半選択）        |
| 選択数 = 全体数（かつ 1 件以上） | チェック済み                   |

---

## 使用コンポーネント・状態

| 要素                | 種別           | 役割                                                                                                                                |
| ------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `MemberList`        | コンポーネント | ヘッダーチェックボックスと各行チェックボックス、「削除」ボタンを内包する                                                            |
| `headerCheckboxRef` | ref            | テーブルヘッダーのネイティブ `<input type="checkbox">` への参照。`useEffect` で `indeterminate` 属性を DOM に直接設定するために使用 |
| `selectedIds`       | state          | 選択済みメンバー ID の集合（`Set<number>`）                                                                                         |
| `isAllSelected`     | 派生値         | `members.length > 0 && selectedIds.size === members.length` のとき `true`。ヘッダーチェックボックスの `checked` に反映              |
| `isSomeSelected`    | 派生値         | `selectedIds.size > 0 && selectedIds.size < members.length` のとき `true`。ヘッダーチェックボックスの `indeterminate` に反映        |
| `handleSelectAll`   | イベント関数   | 全選択 / 全解除を切り替える。`isAllSelected` が `true` のとき全解除、それ以外は全選択                                               |

---

## 確認観点

```
- [ ] メンバーが 0 件のときヘッダーチェックボックスが disabled で操作不可
- [ ] メンバーが 1 件以上のとき全未選択状態ではヘッダーチェックボックスが未チェック
- [ ] ヘッダーチェックボックスをクリックすると全メンバーが一括選択される（全未選択 → 全選択）
- [ ] 全選択状態でヘッダーチェックボックスをクリックすると全解除される
- [ ] 一部のみ選択されているときヘッダーチェックボックスが indeterminate 表示になる
- [ ] indeterminate 状態でヘッダーチェックボックスをクリックすると全選択になる
- [ ] 全選択後に「削除」ボタンが enabled になる
- [ ] 全解除後に「削除」ボタンが disabled に戻る
- [ ] 削除成功後はヘッダーチェックボックスが未チェック状態にリセットされる
- [ ] data-testid="header-checkbox" でヘッダーチェックボックスを識別できる
```

---

## 対応する API 仕様

→ `plans/group/delete-group-members/prd.md`（メンバー削除フローの一部として実装）
