# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Overview

`sample-front` はフロントエンドのサンプル実装ディレクトリです。

実装が追加されたら、以下の項目をこのファイルに追記してください：

- ビルドコマンド
- テスト実行コマンド（単体・E2E）
- lint / フォーマットコマンド
- ローカル起動コマンド
- アーキテクチャの概要（コンポーネント構成、状態管理など）

## アーキテクチャ

このプロジェクトは **Feature-Sliced Design (FSD) v2.1** を採用しています。

### FSD スキルの自走ルール

以下のいずれかに該当する作業を行う際は、明示的な指示がなくても **必ず** `feature-sliced-design`
スキルを呼び出してから実装すること：

- 新しいファイル・ディレクトリを `src/` 配下に作成する
- 既存のレイヤー（`app/`, `pages/`, `shared/` など）を変更・追加する
- コンポーネント・hooks・API クライアントの配置を決める
- レイヤー間のインポートを追加する
- FSD の構造に関するレビューや見直しを行う

### 現在のレイヤー構成

```
src/
  app/          ← アプリ初期化・グローバルスタイル
  pages/        ← ルート単位のページ
  shared/       ← インフラ（API クライアント・設定・UI キット）
```
