---
name: Responsive layout with CSS class + single MemberList
description: GroupDetailのレスポンシブレイアウトではCSSクラスで表示切替。APIコール重複を防ぐためMemberListは1つだけマウントする
type: project
---

GroupDetailContent のレスポンシブ実装パターン：

- `split-view-pc` クラス: PC（769px以上）で `display: flex`、スマホで `display: none`
- `split-view-mobile` クラス: スマホ（768px以下）で `display: flex`、PCで `display: none`
- CSS は `src/app/styles/index.css` で定義
- `MemberList` は1つだけマウントする（PCとスマホで別々に置くと `fetchGroupMembers` が2回呼ばれる）
- `Select.Content` は `Theme` コンテキストが必要。テストでは `Theme` ラッパーを追加する
- スマホ用セレクターは `Select.Root` / `Select.Trigger` / `Select.Content` / `Select.Item` を使用

**Why:** 2つの MemberList をマウントするとキャッシュを持っていない状態で2回フェッチが走り、`fetchGroupMembers` のモックが `undefined` を返してテストが壊れた。

**How to apply:** レスポンシブで「表示切替」のみが必要な場合は CSS クラス方式を使い、APIを呼ぶコンポーネントは1回だけマウントする。
