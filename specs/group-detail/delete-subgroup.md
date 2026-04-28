# delete-subgroup — サブグループ削除

## 概要

グループ詳細画面の Subgroups セクションに表示されているサブグループ行の [Delete] ボタンをクリックすると、削除確認ダイアログ（AlertDialog）が表示される。ダイアログ内の Delete ボタンで確認すると、選択したサブグループとの親子関係を解除する。親グループ・子グループ自体は削除されない。

---

## 処理フロー（正常系）

```
ユーザーがサブグループ行の [Delete] ボタンをクリックする
  │
  ├─ SubgroupList が deletingSubgroupId state に対象サブグループの ID をセットする
  ├─ DeleteSubgroupDialog（AlertDialog）が open 状態になる
  │    ├─ Title: "Delete Subgroup"
  │    └─ Description: "Are you sure you want to delete this subgroup? This action cannot be undone."
  ├─ ユーザーが [Delete] ボタンをクリックする
  ├─ DELETE /api/v1/groups/:id/subgroups/:childId を送信する
  ├─ API が 204 No Content を返す
  ├─ ダイアログを閉じる（onOpenChange(false)）
  └─ refetch() でサブグループ一覧を再取得する
```

---

## 処理フロー（異常系）

```
DELETE で 404 Not Found（対象の親子関係が存在しない）
  │
  └─ ダイアログ内に「対象のサブグループ関係が見つかりませんでした」を表示する
     ダイアログは開いたまま

DELETE で 4xx・5xx（その他エラー）
  │
  └─ ダイアログ内に「サブグループの削除に失敗しました。しばらくしてから再度お試しください」を表示する
     ダイアログは開いたまま

ユーザーが [Cancel] ボタンをクリックする
  │
  └─ ダイアログを閉じる（エラーメッセージもクリアされる）。API は呼ばれない
```

---

## 使用コンポーネント・状態

| 要素                   | 種別           | 役割                                                                                           |
| ---------------------- | -------------- | ---------------------------------------------------------------------------------------------- |
| `SubgroupList`         | コンポーネント | 各サブグループ行に [Delete] ボタンを表示し、クリックで `deletingSubgroupId` state をセットする |
| `DeleteSubgroupDialog` | コンポーネント | 削除確認 AlertDialog。Title・Description・Cancel／Delete ボタン・インラインエラーを提供する    |
| `useDeleteSubgroup`    | カスタム Hook  | `isLoading`・`error`・`deleteSubgroup()`・`clearError()` を管理する                            |
| `deleteSubgroup`       | API 関数       | `DELETE /api/v1/groups/:id/subgroups/:childId` を呼び出す                                      |
| `deletingSubgroupId`   | state          | 削除対象のサブグループ ID（`number \| null`）。`null` のときダイアログは閉じている             |
| `isLoading`            | state          | API 呼び出し中かどうか。`true` のとき Delete ボタンを disabled にする                          |
| `error`                | state          | API エラーメッセージ。ダイアログ内のインライン表示に使用する                                   |

---

## 確認観点

```
- [ ] サブグループ行ごとに [Delete] ボタン（赤・pill 形）が表示される
- [ ] [Delete] クリックで DeleteSubgroupDialog が開く
- [ ] ダイアログに "Delete Subgroup" タイトルと確認メッセージが表示される
- [ ] [Cancel] クリックでダイアログが閉じ、API は呼ばれない
- [ ] [Cancel] 後にダイアログを再度開くとエラーメッセージが表示されない（クリア済み）
- [ ] [Delete] クリックで DELETE API が送信される
- [ ] 204 成功時にダイアログが閉じ、サブグループ一覧が再取得される
- [ ] 404 エラー時にダイアログ内に「対象のサブグループ関係が見つかりませんでした」が表示される（ダイアログは開いたまま）
- [ ] 5xx エラー時にダイアログ内に汎用エラーメッセージが表示される（ダイアログは開いたまま）
- [ ] API 呼び出し中は [Delete] ボタンが disabled になる
```

---

## 使用 API

| エンドポイント                          | メソッド | 用途                                   |
| --------------------------------------- | -------- | -------------------------------------- |
| `/api/v1/groups/:id/subgroups/:childId` | DELETE   | 指定した親子グループ関係を物理削除する |

---

## 対応する API 仕様

→ `plans/group/delete-subgroup/prd.md`
