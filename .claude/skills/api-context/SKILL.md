---
name: api-context
description: sample-api サービスのコンテキスト定義。バックエンド実装に必要なスキルと参照先を一元管理する。新しいドメイン実装・バックエンド作業時に自動ロードされる。
---

# sample-api コンテキスト

## 使用スキル

| スキル名 | 用途 | パス |
|---|---|---|
| `go-clean-arch` | Clean Architecture パターンに従った実装・テスト | `sample-api/.claude/skills/go-clean-arch/SKILL.md` |

## 作業開始時の手順（順序厳守）

1. `sample-api/CLAUDE.md` を Read して、プロジェクトの規約・ガイドラインを把握する
2. `sample-api/docs/steering/*.md` を Read して、技術スタック・アーキテクチャを把握する
3. 下記の「Go Clean Architecture スキル」セクションを参照してアーキテクチャルール・実装テンプレート・テストパターンを把握する

この 3 ステップは省略不可。必ず実装開始前に完了すること。

> **重要**: 新しいドメイン（Entity / Repository / Service / Handler）を追加・変更する際は、必ず「Go Clean Architecture スキル」の指示に従うこと。

---

## Go Clean Architecture スキル

@sample-api/.claude/skills/go-clean-arch/SKILL.md

> **注意**: 本ファイル内のスキル参照（`@` で始まるパス）が展開されず内容が空の場合、該当パスのファイルが存在するか Read ツールで確認すること。ファイルが存在しない場合は、ユーザーにスキルファイルの作成が必要である旨を報告し、作業を中断する。
