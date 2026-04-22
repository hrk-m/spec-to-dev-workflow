# PRD: sheet-navigation

## 概要

| 項目     | 内容                                                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 機能名   | `sheet-navigation`                                                                                                                                                                           |
| 目的     | グループ詳細への遷移をページ全体の切り替えからスライドインシートに変更し、コンテキストを保ちながら詳細・ネスト画面を表示できるようにする。またシートから直接フルページへ展開できるようにする |
| 変更対象 | フロントエンドのみ（API 変更なし）                                                                                                                                                           |
| 影響機能 | list-groups / get-group / list-group-members                                                                                                                                                 |

---

## 確認ステップ 5-1: UI トリガー

| #   | トリガー                                     | アクション                                                          |
| --- | -------------------------------------------- | ------------------------------------------------------------------- |
| 1   | GroupList の行クリック                       | GroupDetailSheet をシートスタックに積む（右からスライドイン）       |
| 2   | GroupDetailSheet 内のメンバー行クリック      | MemberDetailSheet をシートスタックに積む（右からスライドイン）      |
| 3   | 各シートの閉じるボタン（`>`）クリック        | 最前面シートを 1 段閉じる（右へスライドアウト）                     |
| 4   | 左端 10% の前画面エリアクリック              | 最前面シートを 1 段閉じる（右へスライドアウト）                     |
| 5   | ESC キー                                     | 最前面シートを 1 段閉じる（右へスライドアウト）                     |
| 6   | GroupDetailSheet ヘッダーの ↔ ボタンクリック | `/groups/:id` へ `replace: true` で遷移しフルページ表示に切り替える |

---

## 確認ステップ 5-2: 処理フロー

### シートを開く

```
1. ユーザーが GroupList のグループ行をクリック
2. openSheet({ id: `group-${groupId}`, content: <GroupDetailSheet groupId={groupId} /> }) を呼ぶ
3. Sheet コンポーネントが translateX(100%) → translateX(0) で 300ms ease-in-out スライドイン
4. 前画面（GroupList）は動かず、シート幅 90vw のため左端 10% にちらっと見える
5. 終了
```

```
1. ユーザーが GroupDetailSheet のメンバー行をクリック
2. openSheet({ id: `member-${memberId}`, content: <MemberDetailSheet member={member} /> }) を呼ぶ
3. 同じスライドインアニメーション
4. 前シート（GroupDetailSheet）は動かず、左端 10% に見える
5. 終了
```

### シートを閉じる

```
1. ユーザーが閉じるボタン（`>`）or 左端 10% エリア or ESC キーを操作
2. closeSheet() を呼ぶ
3. closing ステートを true にセット → translateX(100%) に変更（スライドアウト開始）
4. transitionend イベント発火後にスタックから pop（DOM 削除）
5. 前シートが再び全幅で表示される
6. 終了
```

### アニメーション仕様

| 項目              | 値                                                         |
| ----------------- | ---------------------------------------------------------- |
| シート幅          | 90vw                                                       |
| 位置              | position: fixed, right: 0, top: 0, height: 100vh           |
| 開く transition   | `transform 300ms ease-in-out`                              |
| 閉じる transition | `transform 300ms ease-in-out`（transitionend で DOM 削除） |
| スライドイン      | translateX(100%) → translateX(0)                           |
| スライドアウト    | translateX(0) → translateX(100%)                           |
| z-index           | 100 + スタックインデックス（Radix Dialog の 200 より下）   |
| box-shadow        | -4px 0 24px rgba(0,0,0,0.15)                               |

### Provider 配置方針（RouterProvider Context 問題 + FSD IoC）

`createBrowserRouter` + `RouterProvider` は独立した React ツリーを形成するため、
`App.tsx` 外側で Provider をラップしても Context が伝播しない。

また FSD では `pages/home` (GroupList) が `pages/group-detail` (GroupDetailSheet) を
直接インポートすることは同一レイヤー間クロスインポートとなり禁止される。

**対処**: `router.tsx` に `Layout` と `HomePageWithSheets` wrapper を追加し、
`app/` 層が両 pages を IoC（依存性の逆転）で接続する（FSD Section 7 Strategy 3）。

- `GroupList.tsx` は `onGroupClick: (groupId: number) => void` を受け取るだけで GroupDetailSheet を知らない
- `GroupDetailSheet.tsx` は `onMemberClick?: (member: Member) => void` を受け取るだけで MemberDetailSheet を知らない
- `app/router.tsx` の `HomePageWithSheets` が全コンポーネントをインポートして接続する

```tsx
// router.tsx
import { GroupDetailSheet, MemberDetailSheet } from "@/pages/group-detail";
import { HomePage } from "@/pages/home";

function HomePageWithSheets() {
  const { openSheet } = useSheetStack();

  const handleGroupClick = useCallback(
    (groupId: number) => {
      openSheet({
        id: `group-${groupId}`,
        content: (
          <GroupDetailSheet
            groupId={groupId}
            onMemberClick={(member) =>
              openSheet({
                id: `member-${member.id}`,
                content: <MemberDetailSheet member={member} />,
              })
            }
          />
        ),
      });
    },
    [openSheet],
  );

  return <HomePage onGroupClick={handleGroupClick} />;
}

function Layout() {
  return (
    <SheetStackProvider>
      <Outlet />
    </SheetStackProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePageWithSheets /> },
      { path: "/groups", element: <HomePageWithSheets /> },
      { path: "/groups/:id", element: <GroupDetailPage /> },
    ],
  },
]);
```

### フルページへ展開する

```
1. ユーザーが GroupDetailSheet ヘッダーの ↔ ボタンをクリック
2. navigate(`/groups/${groupId}`, { replace: true }) を呼び出す
   - replace: true のため、シートの履歴エントリを上書きする
3. location.state に presentation: "sheet" がない → GroupDetailPage をフルページ表示
4. ブラウザの戻るボタンで /groups 一覧に戻る
5. 終了
```

### /groups/:id 直接アクセス

- `GroupDetailPage.tsx` は変更しない
- `/groups/:id` への直接アクセスは引き続きフルページ表示を維持する

---

## 確認ステップ 5-3: DB 操作

なし（フロントエンドのみの変更）

---

## 確認ステップ 5-4: エラーケース

| #   | 状況                                                                | 挙動                                               |
| --- | ------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | シートを開いた後に API でグループが見つからない（404）              | シート内にエラーメッセージ表示（シートは閉じない） |
| 2   | シートを開いた後に API でネットワークエラー                         | シート内にエラーメッセージ表示（既存挙動を踏襲）   |
| 3   | MemberDetailSheet にデータなし                                      | 「詳細は今後追加予定」メッセージを表示             |
| 4   | ↗ ボタンクリック時（groupId は props 必須のため未定義は発生しない） | バリデーション不要。navigate のみ呼び出す          |
| 5   | ↗ クリック後の遷移先でグループが見つからない（404）                 | 既存の GroupDetailPage のエラー表示をそのまま使用  |

---

## 確認ステップ 5-5: ユニットテストケース

| #   | 対象                  | テスト内容                                                                     | 期待結果                     |
| --- | --------------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| 1   | Sheet                 | children が正しくレンダリングされる                                            | レンダリング確認             |
| 2   | Sheet                 | 閉じるボタン（`>`）クリックで onClose が呼ばれる                               | onClose 1 回呼び出し         |
| 3   | Sheet                 | ESC キーで onClose が呼ばれる                                                  | onClose 1 回呼び出し         |
| 4   | Sheet                 | `headerActions` prop が渡されたとき × ボタンの左隣にレンダリングされる         | headerActions の表示確認     |
| 5   | SheetStackContext     | openSheet でスタックに 1 枚追加される                                          | sheets.length が増える       |
| 6   | SheetStackContext     | closeSheet でスタックから 1 枚削除される                                       | sheets.length が減る         |
| 7   | GroupList             | 行クリックで openSheet が呼ばれる（navigate は呼ばれない）                     | openSheet の呼び出し確認     |
| 8   | MemberList            | onMemberClick が渡されたときメンバー行クリックで呼ばれる                       | onMemberClick の呼び出し確認 |
| 9   | MemberDetailSheet     | member props のメンバー名が表示される                                          | 姓名のレンダリング確認       |
| 10  | GroupNavigationLayout | ↔ ボタンが GroupDetailSheet を含む Sheet にレンダリングされる                  | ↔ ボタンの表示確認           |
| 11  | GroupNavigationLayout | ↔ ボタンクリックで `navigate('/groups/groupId', { replace: true })` が呼ばれる | navigate 1 回呼び出し確認    |
| 12  | 既存テスト            | GroupDetailPage.test / MemberList.test が壊れない                              | 全 pass 維持                 |

### テスト環境対応

- `GroupList.test.tsx` のレンダリングを `SheetStackProvider` でラップする（openSheet を使用するため）
- `MemberList` の `onMemberClick` prop は optional にする（既存テストへの影響を最小化）

---

## ファイル配置

### 新規作成

| ファイル                                                         | 役割                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `sample-front/src/shared/ui/Sheet.tsx`                           | スライドインシートコンポーネント（90vw・fixed・アニメーション）                                  |
| `sample-front/src/shared/ui/Sheet.styles.ts`                     | Sheet のスタイル定義                                                                             |
| `sample-front/src/shared/lib/sheet-stack/SheetStackContext.tsx`  | openSheet / closeSheet / closeAll / sheets を提供する Context                                    |
| `sample-front/src/shared/lib/sheet-stack/SheetStackProvider.tsx` | Provider + シートスタックのレンダリング                                                          |
| `sample-front/src/shared/lib/sheet-stack/index.ts`               | barrel export                                                                                    |
| `sample-front/src/pages/group-detail/ui/GroupDetailSheet.tsx`    | GroupDetailPage のシートコンテンツ版（useParams なし・groupId と onMemberClick を props で受取） |
| `sample-front/src/pages/group-detail/ui/MemberDetailSheet.tsx`   | メンバー詳細シート（プレースホルダー）                                                           |

### 変更

| ファイル                                                           | 変更内容                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sample-front/src/app/router.tsx`                                  | Layout + HomePageWithSheets を追加（SheetStackProvider・IoC wiring）。GroupDetailRouteSheet に ↗ ボタンを `headerActions` として渡す                                                                  |
| `sample-front/src/app/routes/GroupNavigationLayout.tsx`            | ↔ ボタン（`TbArrowsHorizontal`）を `headerActions` として `Sheet` に渡し、`navigate('/groups/:id', { replace: true })` を呼び出す app 層のレイアウトコンポーネント（`GroupDetailRouteSheet` の実体） |
| `sample-front/src/shared/ui/Sheet.tsx`                             | `headerActions?: ReactNode` prop を追加。× ボタンの左隣に描画                                                                                                                                         |
| `sample-front/src/shared/ui/index.ts`                              | Sheet を再エクスポートに追加                                                                                                                                                                          |
| `sample-front/src/pages/home/ui/GroupList.tsx`                     | 行クリックに `onGroupClick?: (groupId: number) => void` prop を追加。prop があれば呼ぶ・なければ navigate()                                                                                           |
| `sample-front/src/pages/home/ui/HomePage.tsx`                      | `onGroupClick?: (groupId: number) => void` prop を GroupList に中継                                                                                                                                   |
| `sample-front/src/pages/group-detail/ui/MemberList.tsx`            | メンバー行に onClick 追加・onMemberClick prop を optional で追加                                                                                                                                      |
| `sample-front/src/pages/group-detail/index.ts`                     | GroupDetailSheet と MemberDetailSheet を追加エクスポート                                                                                                                                              |
| `sample-front/src/pages/group-detail/ui/GroupDetailPage.tsx`       | 戻るボタンアイコン（`FaChevronLeft`）に `size={14}` を追加（表示サイズの明示）                                                                                                                        |
| `sample-front/src/pages/group-detail/ui/GroupDetailPage.styles.ts` | `backButton` スタイルを調整（`color: textSecondary`・`fontSize: 16`・`height: 32` を設定）                                                                                                            |

### 変更しない

| ファイル                         | 理由                                                    |
| -------------------------------- | ------------------------------------------------------- |
| `sample-front/src/app/App.tsx`   | Layout コンポーネントで Provider を管理するため変更不要 |
| すべての sample-api ファイル     | API 変更なし                                            |

---

## 最低要件

1. `SheetStackProvider` が `router.tsx` の `Layout` コンポーネント内に配置されており、全ルートコンポーネントからシートを開閉できる
2. `GroupList.tsx` は `onGroupClick?: (groupId: number) => void` prop を受け取り、prop があれば呼び出す（なければ navigate() にフォールバック）
3. `app/router.tsx` の `HomePageWithSheets` wrapper が GroupDetailSheet・MemberDetailSheet を IoC で接続し、openSheet を呼ぶ（GroupList は GroupDetailSheet を直接インポートしない）
4. `GroupDetailSheet` が GroupDetailPage の内容をシートコンテンツとして表示する（PageContainer・戻るボタンなし・groupId と onMemberClick を props で受取）
5. `Sheet` コンポーネントが幅 90vw・右端固定で `translateX(100%) → translateX(0)` にスライドイン、閉じるときは `closing` ステート経由で `transitionend` 後に DOM 削除（300ms ease-in-out）
6. シート幅が 90vw のため、前画面が左端 10% にちらっと見える
7. 閉じるボタン（`FaChevronRight` アイコン）・左端 10% エリアクリック・ESC キーで最前面シートを 1 段閉じる
8. `MemberList.tsx` のメンバー行がクリック可能になり（`onMemberClick` optional prop）、クリックで `MemberDetailSheet` をスタックに積む
9. `MemberDetailSheet` がメンバー名（姓・名）とプレースホルダーメッセージを表示する
10. `/groups/:id` への直接アクセスは引き続き `GroupDetailPage` のフルページ表示を維持する
11. `Sheet` コンポーネントが `headerActions?: ReactNode` prop を持ち、× ボタンの左隣に描画する
12. `GroupDetailRouteSheet`（`GroupNavigationLayout.tsx`）が ↔ ボタン（`TbArrowsHorizontal` アイコン）を `headerActions` として渡し、クリック時に `navigate('/groups/:id', { replace: true })` を呼び出す
13. ↗ クリック後のブラウザ戻るボタンで `/groups` 一覧に戻る
14. `make test`・`make lint`・`make build` がすべて pass する

---

## 対象外

- API の変更・追加
- URL のシート状態反映（ブラウザバックでシートを閉じる等）
- メンバー追加・編集画面の実装（MemberDetailSheet はプレースホルダーのみ）
- スワイプジェスチャーによるシート操作
