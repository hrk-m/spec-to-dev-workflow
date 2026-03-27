# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`sample-api` はバックエンド API のサンプル実装ディレクトリです。

実装が追加されたら、以下の項目をこのファイルに追記してください：

- ビルドコマンド
- テスト実行コマンド（単体・統合）
- lint / フォーマットコマンド
- ローカル起動コマンド
- アーキテクチャの概要

## コマンド

```bash
# ビルド
go build ./...

# テスト
go test ./...

# ローカル起動
go run main.go
```

## 実装ガイドライン

新しいドメイン（Entity / Repository / Service / Handler）を追加する際は、必ず `/go-clean-arch` スキルを使用してください。

```text
/go-clean-arch
```

スキルは `.claude/skills/go-clean-arch/` に定義されており、Clean Architecture パターンに従ったコード生成・修正を行います。

## アーキテクチャ概要

- フレームワーク: [labstack/echo](https://github.com/labstack/echo)
- エントリーポイント: `main.go`
- ポート: `8080`

## エンドポイント

| Method | Path     | 説明               |
|--------|----------|--------------------|
| GET    | /hello   | `{"message":"hello"}` を返す |
