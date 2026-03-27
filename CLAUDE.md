# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`spec-to-dev-workflow` は仕様（spec）から開発（dev）へのワークフローを管理するリポジトリです。

## ディレクトリ構成

- `specs/` — 要件定義・テストコード（機能単位でディレクトリを分割）
- `sample-api/` — バックエンド API のサンプル実装（未実装）
- `sample-front/` — フロントエンドのサンプル実装（未実装）

## 仕様書

`/steering` 実行後に生成される仕様書は以下のパスを参照してください。

@specs/

## 開発プロセス

本リポジトリは **spec-to-dev-workflow エージェント** が全体を統括し、各ディレクトリのサブエージェントに実装を委譲する構成です。詳細は `README.md` の「開発プロセス」を参照してください。

<!-- TODO: sample-api/ と sample-front/ に実装が追加されたら、各ディレクトリの CLAUDE.md とあわせてビルド・テスト・lint コマンドをこのファイルに追記する -->
