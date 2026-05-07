# PRD: header-account-display

## 概要

| 項目         | 内容                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------- |
| 機能名       | `header-account-display`                                                                 |
| 目的         | Header にログインユーザーのアカウント情報（UUID とユーザー名）をドロップダウンで表示する |
| API          | なし（AuthContext から取得）                                                             |
| 認証         | 必要（ProtectedRoute 配下に配置済み）                                                    |
| データソース | AuthContext（`useAuth().user`）                                                          |

---

## 確認ステップ 5-1: リクエスト・バリデーション

### データ要件

リクエストパラメータなし。AuthContext から以下を取得する。

| フィールド       | 型     | 必須 | 説明                                |
| ---------------- | ------ | ---- | ----------------------------------- |
| `user.uuid`      | string | ✓    | ログインユーザーの UUID（フル形式） |
| `user.firstName` | string | ✓    | ファーストネーム                    |
| `user.lastName`  | string | ✓    | ラストネーム                        |

#### バリデーション一覧

| #   | 対象フィールド | ルール                          | エラー時の挙動     |
| --- | -------------- | ------------------------------- | ------------------ |
| 1   | `user`         | ProtectedRoute が非 null を保証 | バリデーション不要 |

---

## 確認ステップ 5-2: バックエンド処理フロー

バックエンド変更なし。

---

## 確認ステップ 5-2-FE: フロントエンド処理フロー

### コンポーネント: `Header`

凡例: → は条件分岐・次ステップ、終了 はフロー終端を示す

```
1. 開始
2. useAuth() から user.uuid・user.firstName・user.lastName を取得する
3. Header 右端の trailing 領域に FaCircleUser アイコンボタンを描画する
   （aria-label="Account" を維持する）
4. FaCircleUser ボタンをクリックする
   - DropdownMenu が開く → 次へ
5. DropdownMenu にアイコン真下でドロップダウンを表示する
   - UUID（フル形式）を表示する
   - ユーザー名（firstName + " " + lastName）を表示する
6. DropdownMenu 外をクリックまたは Esc キー押下
   - DropdownMenu が閉じる
   - フォーカスのトリガー要素への自動復帰を抑制する 終了
7. 描画完了 終了
```

---

## 確認ステップ 5-3: ファイル配置

**原則: 関与した全ファイルを列挙し、役割は具体的に書く。**

### sample-front

| 対応ステップ | パス                                                           | 役割                                                     |
| ------------ | -------------------------------------------------------------- | -------------------------------------------------------- |
| 5-2-FE       | `sample-front/src/app/App.tsx`                                 | AuthProvider を最上位に配置し、Header・Router を内包する |
| 5-2-FE       | `sample-front/src/app/router.tsx`                              | Router 配線（Layout は AuthProvider をラップしない）     |
| 5-2-FE       | `sample-front/src/widgets/header/ui/Header.tsx`                | useAuth・FaCircleUser ボタン・DropdownMenu 描画          |
| 5-2-FE       | `sample-front/src/widgets/header/ui/Header.styles.ts`          | DropdownMenu コンテンツのスタイル定義                    |
| 5-5          | `sample-front/src/widgets/header/ui/__tests__/Header.test.tsx` | Header テスト（useAuth モック・DropdownMenu 動作）       |

---

## 確認ステップ 5-4: レスポンス・エラーケース

### 正常系

| 状態                 | 表示内容                                             |
| -------------------- | ---------------------------------------------------- |
| 通常表示             | FaCircleUser アイコンボタン                          |
| ドロップダウン展開時 | UUID（フル形式）+ ユーザー名（firstName + lastName） |

### エラーケース一覧

エラーケースなし。ProtectedRoute が上流で認証を保証するため、Header 層に届くエラーはない。

---

## 確認ステップ 5-5: ユニットテストケース

### コンポーネント: `Header`（`__tests__/Header.test.tsx` に追加）

| #   | 観点     | テスト内容                                         | 入力例                           | 期待結果                                |
| --- | -------- | -------------------------------------------------- | -------------------------------- | --------------------------------------- |
| 1   | 正常系   | FaCircleUser アイコンが描画される                  | useAuth が user を返す           | aria-label="Account" のボタンが存在する |
| 2   | 正常系   | アイコンクリックでドロップダウンが開く             | ボタンをクリック                 | UUID とユーザー名が DOM に表示される    |
| 3   | 正常系   | ドロップダウン内に UUID が表示される               | user.uuid = "xxxx-..."           | UUID 文字列が DOM に存在する            |
| 4   | 正常系   | ドロップダウン内にユーザー名が表示される           | firstName="太郎" lastName="山田" | "太郎 山田" が DOM に存在する           |
| 5   | 正常系   | 「HR」テキストが DOM に存在しない                  | useAuth が user を返す           | "HR" が DOM に存在しない                |
| 6   | 外部依存 | useAuth モックで UUID とユーザー名を差し替えられる | vi.mock("shared/auth")           | 指定した値が表示される                  |

---

## 要件

1. Header に FaCircleUser アイコンボタンを表示する
2. アイコンボタンをクリックするとアイコン真下にドロップダウンが表示される
3. ドロップダウン内に UUID（フル形式）とユーザー名（firstName + lastName）を表示する
4. データは `useAuth().user` から取得し、新規 API 呼び出しは行わない
5. `@radix-ui/themes` の `DropdownMenu` を使用してドロップダウンを実装する
6. `aria-label="Account"` を維持する

---

## 対象外

- ログアウト機能
- プロフィール編集
- アバター画像表示
- UUID 以外のユーザー情報の表示
