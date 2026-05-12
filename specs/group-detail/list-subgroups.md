# list-subgroups — サブグループ一覧取得

## 概要

指定された親グループに属するサブグループ一覧のみを軽量に取得する。SubgroupManagementSheet がマウントされたタイミングで自動取得され、シート内のサブグループカードリストに反映される。サブグループ追加・削除の成功時には refetch で最新化される。

`GET /api/v1/groups/:id` の `subgroups` フィールドはフィルターチップ行の描画用として互換性のために残っており、SubgroupManagementSheet 側は独立した本 API で取得することで関心を分離している。

---

## 処理フロー（正常系）

```
ユーザーが「サブグループ管理」ボタンをクリックする
  │
  ├─ SubgroupManagementSheet がマウントされる
  ├─ useSubgroups(groupId) が GET /api/v1/groups/:id/subgroups を 1 回送信する
  ├─ バックエンドから { subgroups: SubgroupSummary[] } が返る
  │    （サブグループなし・親グループ不存在の場合は { subgroups: [] }）
  ├─ subgroups state にレスポンスが格納される
  └─ サブグループカードリスト（id / name / description / member_count）が描画される
     AddSubgroupSheet には useSubgroups の subgroups が props で引き続き渡される

サブグループ追加・削除に成功する
  │
  ├─ useSubgroups.refetch() が呼ばれる
  ├─ refetchKey がインクリメントされ useEffect が再実行される
  └─ GET /api/v1/groups/:id/subgroups を再フェッチして subgroups を更新する
```

---

## 処理フロー（異常系）

```
バックエンドへの通信が失敗する（ネットワークエラー・4xx・5xx）
  │
  ├─ console.error にエラーが記録される
  └─ subgroups state は空のまま維持される（loading / error UI は露出しない）
```

---

## 使用コンポーネント・状態

| 要素                      | 種別             | 役割                                                                                                          |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `SubgroupManagementSheet` | コンポーネント   | サブグループの一覧表示・追加・削除を行うシート。`useSubgroups(groupId)` の subgroups / refetch を消費する     |
| `useSubgroups`            | カスタム Hook    | groupId を引数に受け取り、マウント時と `refetchKey` 変化時に `fetchSubgroups` を呼び出す                      |
| `fetchSubgroups`          | API クライアント | `apiFetch<{ subgroups: SubgroupSummary[] }>(GET /api/v1/groups/:id/subgroups)` のラッパー。subgroups を返す   |
| `subgroups`               | state            | 取得したサブグループ一覧（`SubgroupSummary[]`）を保持する                                                     |
| `refetchKey`              | state            | refetch トリガー用カウンタ。`refetch()` 呼び出しでインクリメントされ useEffect の依存配列で再実行を引き起こす |
| `refetch`                 | コールバック     | `useCallback` 化された関数。サブグループ追加・削除後に呼ぶことで一覧を最新化する                              |
| `isActive`                | クリーンアップ   | useEffect のクロージャ。アンマウント後の setState を防ぐためのフラグ                                          |

---

## 確認観点

```
- [ ] 「サブグループ管理」ボタンを押すと SubgroupManagementSheet が開き、サブグループカードリストが表示される
- [ ] サブグループ 0 件（親グループ不存在を含む）のときは空状態 UI が表示される
- [ ] サブグループ追加が成功すると一覧に新しい行が追加される（refetch 経由で最新化される）
- [ ] サブグループ削除が成功すると対象行が一覧から消える（refetch 経由で最新化される）
- [ ] バックエンドへの通信が失敗してもシートが壊れず、loading / error UI は露出しない（コンソールエラーのみ）
- [ ] AddSubgroupSheet には useSubgroups の subgroups が props として渡される
- [ ] フィルターチップ行（SubgroupFilterChips）は本 API ではなく `GET /api/v1/groups/:id` の subgroups を使用しているため、本 API の失敗時もチップ行は影響を受けない
- [ ] コンポーネントのアンマウント時にステートが更新されない（isActive ガードによるメモリリーク防止）
```

---

## 使用 API

| エンドポイント                 | メソッド | 用途                                                                                   |
| ------------------------------ | -------- | -------------------------------------------------------------------------------------- |
| `/api/v1/groups/:id/subgroups` | GET      | 親グループに属するサブグループ一覧（id / name / description / member_count）を取得する |

---

## 対応する API 仕様

→ `plans/group/list-subgroups/prd.md`
