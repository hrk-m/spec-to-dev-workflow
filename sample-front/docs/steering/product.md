---
inclusion: always
---

# Product

## 目的

`sample-front`
は spec-to-dev-workflow プロジェクトにおけるフロントエンドのサンプル実装です。バックエンド API（`sample-api`）と連携し、仕様駆動開発のワークフローを実証します。

## コア機能

- グループ一覧表示（検索・ページネーション付き、`/api/v1/groups` エンドポイント）
- グループ詳細表示（グループ情報 + メンバー一覧、`/api/v1/groups/:id` + `/api/v1/groups/:id/members` エンドポイント）
- App Shell パターン（Header + Sidebar によるナビゲーション）
- react-router によるクライアントサイドルーティング（`/`, `/groups`, `/groups/:id`）
- 環境変数による API エンドポイントの切り替え
- Feature-Sliced Design に沿ったスケーラブルなフロントエンド構造のデモ

## 価値

- スペックから実装へのワークフローを具体的に示す参照実装
- FSD v2.1 のアーキテクチャパターンを実際のコードで体験できる
