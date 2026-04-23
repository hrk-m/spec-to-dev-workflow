# get-user — ユーザー詳細取得

## 概要

指定した id のユーザー詳細情報（id / UUID / 姓名）を取得して表示する。ユーザー一覧のテーブル行クリックで遷移したページでマウント時に自動実行される。

---

## 処理フロー（正常系）

```
ユーザー一覧のテーブル行をクリックする
  │
  ├─ ルーターが /users/:id へ遷移する
  ├─ UserDetailPage がマウントされる
  ├─ useParams で id を取得する
  ├─ useUserDetail(id) が初期化されローディング中はスケルトンを表示する
  ├─ fetchUser が GET /api/v1/users/:id を呼び出す
  └─ 成功（200）→ id / UUID / 姓名（last_name + first_name）を詳細カードに表示する
```

---

## 処理フロー（異常系）

```
GET /api/v1/users/:id が 404 を返す（該当ユーザーが存在しない）
  │
  └─ 「ユーザーが見つかりません」を表示する

GET /api/v1/users/:id が 4xx / 5xx / ネットワークエラーを返す
  │
  └─ エラーカード（data-testid="user-detail-error"）を表示する
```

---

## 使用コンポーネント・状態

| 要素             | 種別           | 役割                                                               |
| ---------------- | -------------- | ------------------------------------------------------------------ |
| `UserDetailPage` | コンポーネント | ユーザー詳細ページのルートコンポーネント                           |
| `useUserDetail`  | カスタム Hook  | API フェッチ・ローディング・エラー・notFound 状態を管理する        |
| `fetchUser`      | API 関数       | `GET /api/v1/users/:id` を呼び出す                                 |
| `user`           | state          | 取得したユーザー情報（`UserDetail` 型）を保持する。取得前は `null` |
| `loading`        | state          | フェッチ中は `true`。スケルトン表示の条件として使用する            |
| `error`          | state          | エラーメッセージ文字列を保持する。正常時は `null`                  |
| `notFound`       | state          | 404 の場合に `true` になる                                         |

---

## 確認観点

```
- [ ] /users のテーブル行をクリックすると /users/:id へ遷移する
- [ ] /users/:id を開くとマウント時に GET /api/v1/users/:id が呼び出される
- [ ] 取得中はスケルトン（data-testid="user-detail-skeleton"）が表示される
- [ ] 取得成功時に id / UUID / 姓名が正しく表示される
- [ ] 存在しない id（/users/99999 等）で「ユーザーが見つかりません」が表示される
- [ ] API エラー時にエラーカード（data-testid="user-detail-error"）が表示される
- [ ] 「戻る」ボタンをクリックすると /users へ遷移する
```

---

## 使用 API

| エンドポイント      | メソッド | 用途                                                     |
| ------------------- | -------- | -------------------------------------------------------- |
| `/api/v1/users/:id` | GET      | ユーザーの id / uuid / first_name / last_name を取得する |

---

## 対応する API 仕様

→ `plans/user/get-user/prd.md`
