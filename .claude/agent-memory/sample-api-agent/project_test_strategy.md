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
