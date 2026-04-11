# update-group — グループ情報編集

## 概要

グループ詳細画面から、グループの名称（name）と説明（description）を編集できる。`[Edit]` ボタンをクリックするとダイアログが開き、現在の値を初期値として表示する。フルページモード・シートモードの両方で利用できる。

---

## 処理フロー（正常系）

```
ユーザーが [Edit] ボタンをクリックする
  │
  ├─ EditGroupDialog が開く（現在の name / description を初期値として表示）
  ├─ ユーザーが name / description を編集して [Save] をクリックする
  ├─ FE バリデーションが通過する（name が 1〜100 文字）
  ├─ PUT /api/v1/groups/:id を呼び出す（Save ボタンが disabled になる）
  ├─ API が 200 OK + 更新後 Group を返す
  └─ ダイアログが閉じる → useGroupDetail の refetch() が実行される → 画面が更新後データで再レンダリングされる
```

---

## 処理フロー（異常系）

```
FE バリデーションエラー（name が空 or 101 文字以上）
  │
  └─ ダイアログ内にインラインエラーを表示する。API は呼び出さない

API エラー（404 / 500 / ネットワークエラー）
  │
  └─ ダイアログ内にエラーメッセージを表示する（"Error: 404 Not Found" など）。ダイアログは開いたまま
```

---

## 使用コンポーネント・状態

| 要素 | 種別 | 役割 |
|---|---|---|
| `GroupDetailContent` | コンポーネント | `[Edit]` ボタンを配置し、`EditGroupDialog` の表示状態を管理する |
| `EditGroupDialog` | コンポーネント | 編集フォーム・バリデーション・エラー表示を担当する Radix UI Dialog |
| `useUpdateGroup` | カスタム Hook | `isLoading` / `error` 状態管理・FE バリデーション・PUT API 呼び出しを行う |
| `useGroupDetail` | カスタム Hook | `refetch()` を提供し、保存成功後にグループ情報を再取得する |
| `editDialogOpen` | state | ダイアログの開閉状態を管理する |
| `isLoading` | state | API 呼び出し中かどうかを保持し、Save ボタンの disabled 状態に連動する |
| `error` | state | API エラーメッセージを保持する |

---

## 確認観点

```
- [ ] フルページ・シートモードの両方に [Edit] ボタンが表示される
- [ ] [Edit] クリックでダイアログが開き、現在の name / description が初期値として表示される
- [ ] name / description を変更して Save → 成功 → ダイアログが閉じ、画面が更新後データで再レンダリングされる
- [ ] description を空にして Save → 成功する（description は任意項目）
- [ ] name が空の状態で Save → "Name is required" インラインエラーが表示される
- [ ] name が 101 文字以上で Save → "Name must be 100 characters or less" が表示される
- [ ] API 呼び出し中は Save ボタンが disabled になる
- [ ] Cancel ボタンでダイアログが閉じる（API は呼び出されない）
- [ ] API が 404 を返す → ダイアログ内にエラーメッセージが表示される（ダイアログは開いたまま）
- [ ] API が 500 を返す → ダイアログ内にエラーメッセージが表示される（ダイアログは開いたまま）
```

---

## 使用 API

| エンドポイント | メソッド | 用途 |
|---|---|---|
| `/api/v1/groups/:id` | PUT | グループの name / description を更新する |

---

## 対応する API 仕様

→ `plans/group/update-group/prd.md`
