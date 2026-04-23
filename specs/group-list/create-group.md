# create-group — グループ作成モーダル

## 概要

グループ一覧ページ右上の「Create Group」ボタンを押すとモーダルが開き、名前と説明を入力して新しいグループを作成できる。作成成功後は作成したグループの詳細ページへ自動的に遷移する。作成者は初期メンバーとして自動登録されるため、作成直後のグループは `member_count: 1` になる。

---

## 処理フロー（正常系）

```
ユーザーが「Create Group」ボタンをクリックする
  │
  └─ CreateGroupDialog（Radix UI Dialog）が開く
       │
       ユーザーが name と description を入力し「Create」ボタンを押す
         │
         ├─ フロントエンドバリデーションを実行する
         │   └─ 通過 → isLoading = true、Create ボタンを disabled にする
         │
         ├─ POST /api/v1/groups を呼び出す
         │
         └─ 201 レスポンスを受信する
              │
              └─ useNavigate で /groups/:id（作成したグループの詳細ページ）へ遷移する
```

---

## 処理フロー（異常系）

```
バリデーションエラー（name 空 / 101 文字以上）
  └─ インラインエラーメッセージを表示する。モーダルは開いたまま

API エラー（500 など）
  └─ モーダル内にエラーメッセージを表示する。モーダルは閉じない
```

---

## 使用コンポーネント・状態

| 要素                | 種別           | 役割                                                          |
| ------------------- | -------------- | ------------------------------------------------------------- |
| `CreateGroupDialog` | コンポーネント | Radix UI Dialog を使ったグループ作成モーダル                  |
| `useCreateGroup`    | カスタム Hook  | フォーム状態・バリデーション・API 呼び出し・遷移を管理        |
| `isLoading`         | state          | API 送信中の状態。true のとき Create ボタンを disabled にする |
| `error`             | state          | API エラーメッセージ。モーダル内に表示する                    |
| `nameError`         | state          | name フィールドのインラインバリデーションエラー               |

---

## 確認観点

```
- [ ] 「Create Group」ボタンがグループ一覧右上に表示される
- [ ] ボタンをクリックするとモーダルが開く
- [ ] name と description を入力して「Create」を押すと作成が成功し、/groups/:id に遷移する
- [ ] description が空でも作成できる
- [ ] name が空のまま「Create」を押すと "Name is required" が表示される
- [ ] name が 101 文字以上で「Create」を押すと "Name must be 100 characters or less" が表示される
- [ ] 「Cancel」ボタンを押すとモーダルが閉じる
- [ ] 送信中は「Create」ボタンが disabled になる
- [ ] API が 500 を返した場合、モーダルが開いたままエラーメッセージが表示される
```

---

## 使用 API

| エンドポイント   | メソッド | 用途                                         |
| ---------------- | -------- | -------------------------------------------- |
| `/api/v1/groups` | POST     | グループを新規作成し、作成したグループを返す |

---

## 対応する API 仕様

→ `plans/group/create-group/prd.md`
