# delete-group — グループ削除

## 概要

グループ詳細画面から、グループを削除できる。`[Delete]` ボタンをクリックすると確認ダイアログが開き、確認後にグループをソフトデリートする。削除成功後はグループ一覧画面へ遷移する。フルページモード・シートモードの両方で利用できる。

---

## 処理フロー（正常系）

```
ユーザーが [Delete] ボタンをクリックする
  │
  ├─ DeleteGroupDialog（AlertDialog）が開く
  ├─ ユーザーが確認ダイアログ内の [Delete] ボタンをクリックする
  ├─ DELETE /api/v1/groups/:id を呼び出す（ダイアログ内 Delete ボタンが disabled になる）
  ├─ API が 204 No Content を返す
  └─ ダイアログが閉じる → グループ一覧（/）へ遷移する
```

---

## 処理フロー（異常系）

```
API エラー（404 / 500）
  │
  └─ ダイアログ内にエラーメッセージを表示する（例: "Error: 404 Not Found", "Error: 500 Internal Server Error"）
     ダイアログは開いたまま維持される

Cancel クリック
  │
  └─ ダイアログが閉じる。API は呼び出されない
```

---

## 使用コンポーネント・状態

| 要素 | 種別 | 役割 |
|---|---|---|
| `GroupDetailContent` | コンポーネント | `[Delete]` ボタンを配置し、`DeleteGroupDialog` の表示状態を管理する |
| `DeleteGroupDialog` | コンポーネント | 削除確認・エラー表示を担当する Radix UI AlertDialog |
| `useDeleteGroup` | カスタム Hook | `isLoading` / `error` 状態管理・DELETE API 呼び出しを行う |
| `deleteDialogOpen` | state | ダイアログの開閉状態を管理する |
| `isLoading` | state | API 呼び出し中かどうかを保持し、ダイアログ内 Delete ボタンの disabled 状態に連動する |
| `error` | state | API エラーメッセージを保持する |

---

## 確認観点

```
- [ ] フルページ・シートモードの両方に [Delete] ボタンが表示される
- [ ] [Delete] クリックで確認ダイアログ（AlertDialog）が開く
- [ ] ダイアログの Cancel ボタンでダイアログが閉じる（API は呼び出されない）
- [ ] ダイアログの [Delete] ボタンをクリックして成功 → ダイアログが閉じ、グループ一覧（/）へ遷移する
- [ ] API 呼び出し中はダイアログ内の [Delete] ボタンが disabled になる
- [ ] API が 404 を返す → ダイアログ内にエラーメッセージが表示される（ダイアログは開いたまま）
- [ ] API が 500 を返す → ダイアログ内にエラーメッセージが表示される（ダイアログは開いたまま）
```

---

## 使用 API

| エンドポイント | メソッド | 用途 |
|---|---|---|
| `/api/v1/groups/:id` | DELETE | グループをソフトデリートする（`deleted_at` に現在時刻を設定） |

---

## 対応する API 仕様

→ `plans/group/delete-group/prd.md`
