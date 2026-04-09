---
name: api-context
description: sample-api サービスのコンテキスト定義。バックエンド実装に必要なスキルと参照先を一元管理する。
---

# sample-api コンテキスト

## 使用スキル

| スキル名 | 用途 | パス |
| --- | --- | --- |
| `go-clean-arch` | Clean Architecture パターンに従った実装・テスト | `sample-api/.claude/skills/go-clean-arch/SKILL.md` |
| `mysql` | MySQL/InnoDB スキーマ設計・インデックス・クエリチューニング・トランザクション管理 | `sample-api/.claude/skills/mysql/SKILL.md` |
| `steering` | `docs/steering/` の同期・drift 検出 | `sample-api/.claude/skills/steering/SKILL.md` |

## 作業開始時の手順（順序厳守）

1. `sample-api/CLAUDE.md` を Read して、プロジェクトの規約・ガイドラインを把握する
2. `sample-api/docs/steering/*.md` を Read して、技術スタック・アーキテクチャを把握する
3. 下記の「Go Clean Architecture スキル」セクションを参照して、アーキテクチャルール・実装テンプレート・テストパターンを把握する

この 3 ステップは省略不可。必ず実装開始前に完了すること。

## Go Clean Architecture スキル

Read ツールで `sample-api/.claude/skills/go-clean-arch/SKILL.md` を読み込むこと。

---

## MySQL スキル

Read ツールで `.claude/skills/api-context/references/mysql/SKILL.md` を読み込むこと。

---

## Steering スキル

`/impl-done` などで `docs/steering/` の同期が必要な場合は、Read ツールで `.claude/skills/api-context/references/steering/SKILL.md` を読み込むこと。

---

## PRD 照合観点

- Repository IF は service 側、Service IF は handler 側に置く
- `domain/` に外部依存を入れない
- service から adapter 実装へ逆依存しない
- handler のエラーハンドリングは `getStatusCode + ResponseError` に揃える
- `app/main.go` は設定読み込み・接続初期化・DI・サーバー起動のみに保つ
- interface を変更する場合は mock と test を同じ変更セットで追随させる
- DB schema 変更は `db/migrate/`、seed は `db/seed/` に置く
