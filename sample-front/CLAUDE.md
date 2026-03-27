# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## プロジェクトコンテキスト

### パス
- Steering: `docs/steering/`
- Specs: `docs/specs/`

### Makefile ショートカット

```bash
make test         # テスト
make test-verbose # テスト（詳細）
make lint         # lint
make fix          # lint + 自動修正
make build        # ビルド
make run          # ローカル起動
```

## 実装ガイドライン

**Feature-Sliced Design (FSD) v2.1** を採用しています。

### FSD スキルの自走ルール

以下のいずれかに該当する作業を行う際は、明示的な指示がなくても **必ず** `feature-sliced-design`
スキルを呼び出してから実装すること

```text
/feature-sliced-design
```
スキルは `.claude/skills/feature-sliced-design/` に定義されており、Feature-Sliced Design (FSD) v2.1** パターンに従ったコード生成・修正を行います。

## Steering ワークフロー
- `/steering` - steering ドキュメントを更新・レビューする

## 開発ルール
- steering を常に最新の状態に保つ
- ユーザーの指示に忠実に従い、その範囲内で自律的に行動すること。必要なコンテキストを収集し、今回の実行でエンドツーエンドの作業を完了する。質問するのは、必須情報が不足している場合や指示が致命的に曖昧な場合に限る。

## Steering 設定
- `docs/steering/` 全体をプロジェクトメモリとして読み込む
- デフォルトファイル: `product.md`, `tech.md`, `structure.md`
- カスタムファイルをサポート
