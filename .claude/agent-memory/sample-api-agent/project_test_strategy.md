---
name: テスト戦略
description: ユニットテスト・統合テストの分離・mock 手動保守の方針
type: project
---

## テスト分類

| テスト種別 | 対象 | 実行方法 |
|---|---|---|
| ユニット（use case 層） | `{feature}/service_test.go` | `go test ./...` |
| ユニット（delivery 層） | `internal/rest/{feature}_test.go` | `go test ./...` |
| 統合（repository 層） | `internal/repository/mysql/{feature}_test.go` | `go test -tags integration ./...` |

## テストファイルの規約

- パッケージ: `package {feature}_test`（外部テストパッケージ）
- 使用ライブラリ: `github.com/stretchr/testify/assert` + `github.com/stretchr/testify/mock`
- `httptest.NewRecorder()` + Echo `e.NewContext()` でエンドポイントを検証

## Mock の場所

- `{feature}/mocks/group_repository_mock.go` → `MockGroupRepository`
- `internal/rest/mocks/group_service_mock.go` → `MockGroupService`

## Mock の方針

- 手動保守（生成ツール不使用）
- interface 変更時は mock も同じ変更セットで更新する
- 必要なメソッドだけを実装した小さな mock を優先する

**How to apply:** 統合テストは `//go:build integration` タグを付けて実 DB に接続する。ユニットテストで DB に接続しない。

## Repository 統合テストのパターン（group_test.go 実績）

- テスト関数名: `TestMysqlGroupRepository_{Method}_{観点}` or `TestMysqlGroupRepository_{Method}` (table-driven subtests)
- setup ヘルパーで動的 INSERT し、defer で逆 FK 順に DELETE (group_relations → group_members → groups)
- 高い ID 範囲（9000+）でテスト用グループを作成し seed data との collision を回避する
- seed users（id 1〜15）をそのまま再利用。FK 違反を防ぐためユーザーは追加しない
- `make test` は `go test ./...` + `go vet -tags integration ./...` のみ（DB 不要）。統合テストは `make test-integration` で別途実行する
- `TestListGroups_DefaultPagination` / `TestListGroups_Search` は seed 不足で既存失敗中（私の変更と無関係）
