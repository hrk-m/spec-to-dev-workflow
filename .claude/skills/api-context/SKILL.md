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
3. 以下のスキルを呼び出してアーキテクチャルール・実装テンプレート・テストパターンを把握する

   ```
   Skill(skill: "go-clean-arch")
   ```

この 3 ステップは省略不可。必ず実装開始前に完了すること。

> **重要**: 新しいドメイン（Entity / Repository / Service / Handler）を追加・変更する際は、必ず `go-clean-arch` スキルの指示に従うこと。

## PRD 照合観点

`plan-checker` がバックエンドの実装方針を確認するときは、このセクションを正とする。
各観点の詳細根拠は `go-clean-arch` と `sample-api/docs/steering/*.md` を参照して判断する。

### API-1. レイヤー構成と配置

- `domain/{domain}.go`
- `{domain}/service.go`
- `internal/repository/mysql/{domain}.go`
- `internal/rest/{domain}.go`
- `app/main.go`

確認ポイント:

- domain / service / repository / rest handler の責務分離が崩れていないか
- Repository 実装を公開ディレクトリへ置く前提になっていないか
- DI 配線が `app/main.go` に集約されているか

### API-2. Interface と依存方向

確認ポイント:

- Repository Interface が `{domain}/service.go` の消費側で宣言されているか
- Service Interface が `internal/rest/{domain}.go` の消費側で宣言されているか
- 依存方向が `rest → {domain}(service) → domain ← repository` を保っているか
- domain に HTTP / ORM / SQL 依存を持ち込んでいないか

### API-3. エラーハンドリング

確認ポイント:

- センチネルエラーを `domain/errors.go` 起点で扱う前提になっているか
- HTTP ステータス変換を `internal/rest/errors.go` の共有マッピングへ寄せているか
- エラーレスポンス形式が `ResponseError{Message: ...}` に統一されているか
- 400 系入力エラーを handler ごとの独自 JSON で増やしていないか

### API-4. 実装スコープ

確認ポイント:

- 最低要件にない CRUD や空 package / 空 interface を先回りで追加していないか
- 既存の `go-clean-arch` パターンに合う最小構成で実装方針を書いているか

### API-5. テスト方針

確認ポイント:

- Service テストが `{domain}/service_test.go` を前提にしているか
- Repository テストが `internal/repository/mysql/{domain}_test.go` を前提にしているか
- Handler テストが `internal/rest/{domain}_test.go` + Service mock を前提にしているか
- mock 自動生成前提を崩していないか

## plan-checker での扱い

- `plan-checker` はバックエンド詳細チェックをこのファイルに依存して実施する
- 不一致を見つけた場合は、このファイルと `go-clean-arch` を根拠に差異を説明する
- スキル定義と現コードが矛盾する場合は、PRD を現コード寄せにせず `skill-definition conflict` として扱う
